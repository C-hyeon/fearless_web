const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");
const formatSeconds = require("../utils/formatSeconds");
const { FieldValue } = admin.firestore;

// 웹 로그인 시 플레이타임 저장
router.post("/save-playtime", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);
        const snap = await userRef.get();
        const data = snap.data() || {};
        const playtimeInSeconds = typeof data.playtime === "number" ? data.playtime : 0;

        res.json({ message: "플레이타임입니다.", playtime: formatSeconds(playtimeInSeconds) });
    } catch (err) {
        res.status(500).json({ message: "플레이타임 조회 실패", error: err.message });
    }
});

// 세션 유지용 Ping 측정 (Polling)
router.post("/update-last-activity", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);
        await userRef.update({ lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ message: "갱신 완료" });
    } catch (err) {
        res.status(500).json({ message: "갱신 실패", error: err.message });
    }
});

// 로그인 직후 60초마다 플레이타임 증가 테스트 라우터
router.post("/playtime-increment-test", authenticateToken, async (req, res) => {
    try {
        const amount = Number(req.body.amount ?? 60);
        const userRef = db.collection("users").doc(req.user.uid);

        await userRef.update({ playtime: FieldValue.increment(amount) });

        return res.sendStatus(204);
    } catch (err) {
        console.error("playtime-increment-test 오류:", err);
        return res.status(500).json({ error: "increment failed" });
    }
});

// 플레이타임 검증
router.get("/playtime-longpoll", authenticateToken, async (req, res) => {
    const t_request = Date.now();
    let t_snapshot = null;

    const userRef = db.collection("users").doc(req.user.uid);
    const since = Number(req.query.since);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Expose-Headers", "X-Server-Process-Time, X-DB-To-Server-Time");

    let finished = false;
    let timeoutId = null;
    let unsubscribe = null;

    function finish(status, body) {
        if (finished) return;
        finished = true;

        if (unsubscribe) { try { unsubscribe(); } catch (_) {} }
        if (timeoutId) { clearTimeout(timeoutId); }

        const t_response = Date.now();
        const serverProcess = t_response - t_request;
        const dbToServer = t_snapshot ? t_snapshot - t_request : 0;

        res.setHeader("X-Server-Process-Time", serverProcess);
        res.setHeader("X-DB-To-Server-Time", dbToServer);

        if (status === 204) return res.sendStatus(status);
        return res.status(status).json(body);
    }

    unsubscribe = userRef.onSnapshot(
        (snapshot) => {
            t_snapshot = Date.now();
            const data = snapshot.data() || {};
            const playtime = data.playtime ?? 0;

            if (!Number.isNaN(since) && playtime === since) return;
            finish(200, { playtime });
        },
        (err) => finish(500, { error: String(err?.message || err) })
    );

    timeoutId = setTimeout(() => finish(204), 600_000);
});

module.exports = router;