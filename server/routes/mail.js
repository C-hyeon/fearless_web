const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const admin = require("firebase-admin");
const authenticateToken = require("../utils/authenticate");
const { sendVerificationEmail } = require("../mailer");
const { v4: uuidv4 } = require("uuid");
const CURRENCY_CREDIT_ID = "currency_credit";
const CURRENCY_TICKET_ID = "currency_ticket"; 

// 로컬 회원가입 시 이메일 인증코드 발송
router.post("/request-verification", async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await db.collection("verifications").doc(email).set({
        code,
        createdAt: Date.now()
    });

    await sendVerificationEmail(email, code);
    res.json({ message: "인증 코드 발송 완료" });
});

// 이메일 인증코드 확인
router.post("/verify-code", async (req, res) => {
    const { email, code } = req.body;
    const doc = await db.collection("verifications").doc(email).get();
    const data = doc.data();

    if (!data || Date.now() - data.createdAt > 5 * 60 * 1000) {
        return res.status(400).json({ message: "코드 만료" });
    }

    if (data.code !== code) {
        return res.status(400).json({ message: "인증 실패" });
    }

    res.json({ message: "인증 성공" });
});

// 우편함 조회(티켓/코인 제외)
router.get("/mailbox", authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection("users").doc(req.user.uid).collection("mailbox").orderBy("timestamp", "desc").get();   // timestamp 추가 수정
        const mailbox = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const filtered = mailbox.filter((mail) => {
            const items = Array.isArray(mail.items) ? mail.items : [];
            return !items.some(
                (it) => it?.itemID === CURRENCY_CREDIT_ID || it?.itemID === CURRENCY_TICKET_ID
            );
        });     // filtered 변수 수정

        res.json({ mailbox: filtered });
    } catch (err) {
        res.status(500).json({ message: "우편함 로드 실패", error: err.message });
    }
});

// 우편함 조회(티켓/코인 포함)
router.get("/mailbox-all", authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection("users").doc(req.user.uid).collection("mailbox").orderBy("timestamp", "desc").get();   // timestamp 추가 수정
        const mailbox = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ mailbox });
    } catch (err) {
        res.status(500).json({ message: "전체 우편함 로드 실패", error: err.message });
    }
});

// 우편함 추가
router.post("/mailbox", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);

        let { title, message, items } = req.body;

        if (!Array.isArray(items)) {
            const { content, count, type, itemID } = req.body;
            title = title ?? req.body.title;
            message = message ?? content ?? "";
            let mappedItemID;

            if (type === "coin") mappedItemID = CURRENCY_CREDIT_ID;
            else if (type === "ticket") mappedItemID = CURRENCY_TICKET_ID;
            else if (typeof type === "string" && type.trim()) mappedItemID = type.trim();
            else mappedItemID = itemID || "unknown_item";

            const mappedCount = Number.isInteger(count) && count > 0 ? count : 1;
            items = [{ itemID: mappedItemID, count: mappedCount }];
        }

        const safeItems = (items || []).filter(i => i && typeof i.count === "number" && i.count > 0 && typeof i.itemID === "string").map(i => ({ itemID: i.itemID, count: i.count }));

        if (!title || !message || safeItems.length === 0) {
            return res.status(400).json({ message: "title, message, items는 필수입니다." });
        }

        const creditInc = safeItems.filter(i => i.itemID === CURRENCY_CREDIT_ID).reduce((sum, i) => sum + (Number(i.count) || 0), 0);

        const ticketInc = safeItems.filter(i => i.itemID === CURRENCY_TICKET_ID).reduce((sum, i) => sum + (Number(i.count) || 0), 0);

        const CURRENCY_SET = new Set([CURRENCY_CREDIT_ID, CURRENCY_TICKET_ID]);
        const isCurrencyOnly = safeItems.every(i => CURRENCY_SET.has(i.itemID));

        const mailId = uuidv4();
        const mailData = {
            title,
            message,
            items: safeItems,
            isClaimed: isCurrencyOnly,
            isDeleted: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) {
                tx.set(
                    userRef,
                    {
                        ticket: 0,
                        items: { [CURRENCY_CREDIT_ID]: 0 },
                        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
            }

            const mailRef = userRef.collection("mailbox").doc(mailId);
            tx.set(mailRef, mailData);

            const inc = {};
            if (creditInc > 0) inc[`items.${CURRENCY_CREDIT_ID}`] = admin.firestore.FieldValue.increment(creditInc);
            if (ticketInc > 0) inc["ticket"] = admin.firestore.FieldValue.increment(ticketInc);
            if (Object.keys(inc).length) {
                tx.update(userRef, inc);
            }

            tx.update(userRef, { lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
        });

        res.json({ message: "우편 발송 완료(통화 반영됨)", id: mailId });
    } catch (err) {
        res.status(500).json({ message: "우편 발송 실패", error: err.message });
    }
});

module.exports = router;