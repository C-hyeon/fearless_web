const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const authenticateToken = require("../utils/authenticate");
const { sendVerificationEmail } = require("../mailer");
const { v4: uuidv4 } = require("uuid");

// 로컬 회원가입 시 이메일 인증코드 발송
router.post("/request-verification", async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자

    // Firestore에 저장
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
        const snapshot = await db.collection("users").doc(req.user.uid).collection("mailbox").get();
        const mailbox = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredMailbox = mailbox.filter(mail => mail.type !== "coin" && mail.type !== "ticket");
        res.json({ mailbox: filteredMailbox });
    } catch (err) {
        res.status(500).json({ message: "우편함 로드 실패", error: err.message });
    }
});

// 우편함 조회(티켓/코인 포함)
router.get("/mailbox-all", authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection("users").doc(req.user.uid).collection("mailbox").get();
        const mailbox = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ mailbox });
    } catch (err) {
        res.status(500).json({ message: "전체 우편함 로드 실패", error: err.message });
    }
});

// 우편함 추가
router.post("/mailbox", authenticateToken, async (req, res) => {
    const { title, content, count = 1, type, image, description, time } = req.body;

    try {
        const userRef = db.collection("users").doc(req.user.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        // mailbox 모두 기록
        const mailId = uuidv4();
        const mailData = {
            title,
            content,
            count,
            type,
            image,
            description,
            time,
            source: "이벤트",
            date: new Date().toISOString()
        };
        await userRef.collection("mailbox").doc(mailId).set(mailData);

        // coin이나 ticket이면 유저 정보도 업데이트
        if (type === "coin" || type === "ticket") {
            const updateData = {};
            if (type === "coin") updateData.coin = (userData.coin || 0) + count;
            if (type === "ticket") updateData.ticket = (userData.ticket || 0) + count;
            await userRef.update(updateData);
            return res.json({ message: `${type === "coin" ? "골드" : "티켓"} 보상 수령 완료` });
        }

        res.json({ message: "이벤트 보상 전송 완료" });
    } catch (err) {
        res.status(500).json({ message: "보상 수령 실패", error: err.message });
    }
});

module.exports = router;