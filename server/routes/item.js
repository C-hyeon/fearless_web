const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");
const CURRENCY_CREDIT_ID = "currency_credit";

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
    const cost = item?.cost;
    if (typeof cost !== "number" || cost <= 0) {
        return res.status(400).json({ message: "유효하지 않은 아이템 가격" });
    }

    const userRef = db.collection("users").doc(req.user.uid);
    try {
        await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) throw new Error("NO_USER");
        const user = snap.data() || {};

        const have = (type === "web")
            ? (user.ticket || 0)
            : (user.items?.[CURRENCY_CREDIT_ID] || 0);

        if (have < cost) throw new Error("INSUFFICIENT");

        if (type === "web") {
            tx.update(userRef, { ticket: have - cost });
        } else if (type === "game") {
            tx.update(userRef, { [`items.${CURRENCY_CREDIT_ID}`]: have - cost });
        } else {
            throw new Error("BAD_TYPE");
        }

        const mailRef = userRef.collection("mailbox").doc();
        tx.set(mailRef, {
            title: item.title || "구매 보상",
            message: `${type === "web" ? "웹상점" : "게임상점"}에서 구매한 아이템입니다.`,
            items: [{ itemID: item.id || item.itemID || "unknown_item", count: Number.isInteger(item.count) && item.count > 0 ? item.count : 1 }],
            isClaimed: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        });

        res.json({ message: "구매 완료(우편 발송)" });
    } catch (e) {
        if (e.message === "INSUFFICIENT") return res.status(400).json({ message: type === "web" ? "티켓이 부족합니다." : "크레딧이 부족합니다." });
        if (e.message === "BAD_TYPE")    return res.status(400).json({ message: "유효하지 않은 구매 타입" });
        if (e.message === "NO_USER")     return res.status(404).json({ message: "사용자 없음" });
        res.status(500).json({ message: "구매 실패", error: e.message });
    }
});

module.exports = router;