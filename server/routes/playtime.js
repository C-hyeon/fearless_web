const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");

// 웹 로그인 플레이타임 저장
router.post("/save-playtime", authenticateToken, async (req, res) => {
    const { playtimeInSeconds } = req.body;

    if (typeof playtimeInSeconds !== "number" || playtimeInSeconds < 0) {
        return res.status(400).json({ message: "유효하지 않은 playtime 형식입니다." });
    }

    try {
        await db.collection("users").doc(req.user.uid).update({playtime: playtimeInSeconds});

        res.json({ message: "플레이타임 저장 완료" });
    } catch (err) {
        res.status(500).json({ message: "플레이타임 저장 실패", error: err.message });
    }
});

// 세션 유지용 Ping 측정
router.post("/update-last-activity", authenticateToken, async (req, res) => {
    try {
        const { playtimeInSeconds } = req.body;

        if (typeof playtimeInSeconds !== "number" || playtimeInSeconds < 0) {
            return res.status(400).json({ message: "playtimeInSeconds는 유효한 숫자여야 합니다." });
        }

        const userRef = db.collection("users").doc(req.user.uid);
        const snapshot = await userRef.get();
        const data = snapshot.data();

        const storedPlaytime = typeof data.playtime === "number" ? data.playtime : 0;

        const newPlaytime = Math.max(playtimeInSeconds, storedPlaytime); 

        await userRef.update({playtime: newPlaytime, lastUpdatedAt: new Date().toISOString()});

        res.json({ message: "활동 시간 갱신 완료" });
    } catch (err) {
        res.status(500).json({ message: "갱신 실패", error: err.message });
    }
});

module.exports = router;