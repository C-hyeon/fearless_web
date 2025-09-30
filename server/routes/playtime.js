const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");
const formatSeconds = require("../utils/formatSeconds");

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

// 플레이타임 검증
router.get("/playtime-longpoll", authenticateToken, async (req, res) => {
    const userRef = db.collection("users").doc(req.user.uid);

    const since = Number.isFinite(Number(req.query.since)) ? Number(req.query.since) : null;

    let finished = false;
    let timeoutId = null;
    let unsubscribe = null;
    res.setHeader("Cache-Control", "no-store");

    function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        if (typeof unsubscribe === "function") {try { unsubscribe(); } catch {}}
    }

    function finish(status, body) {
        if (finished) return;
        finished = true;
        cleanup();
        if (status === 204 || body === undefined) return res.sendStatus(status);
        return res.status(status).json(body);
    }

    res.on("close", () => { cleanup(); finished = true; });
    res.on("finish", () => { cleanup(); finished = true; });

    try {
        unsubscribe = userRef.onSnapshot(
            (snapshot) => {
                const data = snapshot.data() || {};
                const playtime = typeof data.playtime === "number" ? data.playtime : 0;
                if (since !== null && playtime === since) return;

                finish(200, { playtime });
            },
            (err) => {
                finish(500, { message: "snapshot error", error: String(err?.message || err) });
            }
        );

        timeoutId = setTimeout(() => {finish(204);}, 600_000); 
    } catch (err) {
        finish(500, { message: "long polling 실패", error: err.message });
    }
});

module.exports = router;