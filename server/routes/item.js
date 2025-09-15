const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");

const CURRENCY_CREDIT_ID = "currency_credit";

function firstTruthy(...vals) {
    for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
    for (const v of vals) if (v != null) return v;
    return undefined;
}

function matchByAnyKey(list, key) {
    if (!key) return undefined;
    return list.find((x) =>
        [x.id, x.itemID, x.type, x.sku, x.key].some((k) => typeof k === "string" ? k === key : false)
    );
}

// Firestore 아이템 조회
router.get("/items", async (_req, res) => {
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
    try {
        const { item = {}, source: hintedSource, quantity } = req.body || {};
        const key = firstTruthy(item.id, item.itemID, item.type, item.sku, item.key);
        const bundleQty = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

        const [webSnap, gameSnap] = await Promise.all([
            db.collection("items").doc("web").get(),
            db.collection("items").doc("game").get(),
        ]);
        const webList = webSnap.exists ? webSnap.data().data || [] : [];
        const gameList = gameSnap.exists ? gameSnap.data().data || [] : [];

        const hitWeb = matchByAnyKey(webList, key);
        const hitGame = matchByAnyKey(gameList, key);

        let source;
        let catalogItem;

        if (hitWeb && hitGame) {
            if (hintedSource === "web") { source = "web"; catalogItem = hitWeb; }
            else if (hintedSource === "game") { source = "game"; catalogItem = hitGame; }
            else return res.status(400).json({ message: "아이템 출처가 모호합니다. source를 'web' 또는 'game'으로 지정하세요." });
        } else if (hitWeb) {
            source = "web"; catalogItem = hitWeb;
        } else if (hitGame) {
            source = "game"; catalogItem = hitGame;
        } else {
            return res.status(404).json({ message: "카탈로그에서 아이템을 찾을 수 없습니다." });
        }

        const unitCost = Number(catalogItem.cost ?? catalogItem.price);
        if (!Number.isFinite(unitCost) || unitCost <= 0) {
            return res.status(400).json({ message: "유효하지 않은 아이템 가격(카탈로그)." });
        }
        const totalCost = unitCost * bundleQty;

        const useTicket = source === "web";
        const userRef = db.collection("users").doc(req.user.uid);

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error("NO_USER");
            const user = snap.data() || {};

            const currentTicket = Number(user.ticket || 0);
            const currentCredit = Number(user.items?.[CURRENCY_CREDIT_ID] || 0);

            if (useTicket) {
                if (currentTicket < totalCost) throw new Error("INSUFFICIENT_TICKET");
                tx.update(userRef, { ticket: currentTicket - totalCost });
            } else {
                if (currentCredit < totalCost) throw new Error("INSUFFICIENT_CREDIT");
                tx.update(userRef, { [`items.${CURRENCY_CREDIT_ID}`]: currentCredit - totalCost });
            }

            const mailRef = userRef.collection("mailbox").doc();
            const bundleItemCount = Number.isInteger(item.count) && item.count > 0 ? item.count : (Number.isInteger(catalogItem.count) && catalogItem.count > 0 ? catalogItem.count : 1);
            
            tx.set(mailRef, {
                title: catalogItem.title || item.title || "구매 보상",
                message: `${source === "web" ? "웹상점" : "게임상점"}에서 구매한 아이템입니다.`,
                items: [{
                    itemID: catalogItem.type || item.type || key || "unknown_item",
                    count: bundleItemCount * bundleQty,
                }],
                isClaimed: false,
                isDeleted: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        res.json({ message: "구매 완료(우편 발송)" });
    } catch (e) {
        if (e.message === "NO_USER") return res.status(404).json({ message: "사용자 없음" });
        if (e.message === "INSUFFICIENT_TICKET") return res.status(400).json({ message: "티켓이 부족합니다." });
        if (e.message === "INSUFFICIENT_CREDIT") return res.status(400).json({ message: "크레딧이 부족합니다." });
        res.status(500).json({ message: "구매 실패", error: e.message });
    }
});

module.exports = router;