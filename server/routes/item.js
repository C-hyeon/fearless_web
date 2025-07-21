const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");

// Firestore 아이템 조회
router.get("/items", async (req, res) => {
    try {
        const [eventsSnap, webSnap, gameSnap] = await Promise.all([
            db.collection("items").doc("events").get(),
            db.collection("items").doc("web").get(),
            db.collection("items").doc("game").get()
        ]);

        res.json({
            events: eventsSnap.exists ? eventsSnap.data().data || [] : [],
            webItems: webSnap.exists ? webSnap.data().data || [] : [],
            gameItems: gameSnap.exists ? gameSnap.data().data || [] : []
        });
    } catch (err) {
        res.status(500).json({ message: "아이템 불러오기 실패", error: err.message });
    }
});

// 아이템 구매
router.post("/purchase", authenticateToken, async (req, res) => {
    const { item, type } = req.body;
    try {
        const userRef = db.collection("users").doc(req.user.uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return res.status(404).json({ message: "사용자 없음" });
        const userData = userSnap.data();
        const cost = item.cost;
        if (type === "web" && userData.ticket < cost) return res.status(400).json({ message: "티켓이 부족합니다." });
        if (type === "game" && userData.coin < cost) return res.status(400).json({ message: "골드가 부족합니다." });
        const updateData = {};
        if (type === "web") updateData.ticket = userData.ticket - cost;
        if (type === "game") updateData.coin = userData.coin - cost;
        await userRef.update(updateData);
        const mail = {
            title: item.title,
            content: `${type === "web" ? "웹상점" : "게임상점"}에서 구매한 아이템입니다.`,
            source: type === "web" ? "웹상점" : "게임상점",
            count: item.count,
            date: new Date().toISOString()
        };
        await userRef.collection("mailbox").add(mail);
        res.json({ message: "구매 완료" });
    } catch (err) {
        res.status(500).json({ message: "구매 실패", error: err.message });
    }
});

module.exports = router;