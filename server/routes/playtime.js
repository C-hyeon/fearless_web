const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");

// 웹 로그인 플레이타임 저장
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

// 세션 유지용 Ping 측정
router.post("/update-last-activity", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);
        await userRef.update({ lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ message: "갱신 완료" });
    } catch (err) {
        res.status(500).json({ message: "갱신 실패", error: err.message });
    }
});

module.exports = router;