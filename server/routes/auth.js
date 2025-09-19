const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const router = express.Router();
const { db } = require("../firebase");
const formatSeconds = require("../utils/formatSeconds");
const authenticateToken = require("../utils/authenticate");
const SECRET_KEY = process.env.SECRET_KEY;
const DEFAULT_PROFILE_IMAGE = process.env.DEFAULT_PROFILE_IMAGE;
const isProduction = process.env.NODE_ENV === "production";
const CURRENCY_CREDIT_ID = "currency_credit";

// Google OAuth 로그인
router.post("/oauth/google", async (req, res) => {
    const { uid, email, name } = req.body;

    try {
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        let playtimeInSeconds = 0;
        const now = admin.firestore.FieldValue.serverTimestamp();

        if (!doc.exists) {
            await userRef.set({
                name,
                email,
                provider: "Google",
                playtime: playtimeInSeconds,
                profileImage: DEFAULT_PROFILE_IMAGE,
                ticket: 0,
                items: {[CURRENCY_CREDIT_ID]: 0},
                lastUpdatedAt: now
            }, {merge: true});
        } else {
            const data = doc.data();
            playtimeInSeconds = typeof data.playtime === "number" ? data.playtime : 0;
            await userRef.update({ lastUpdatedAt: now });
        }

        const token = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "7d" });

        res.cookie("token", token, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 3600000 });
        res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 7 * 24 * 3600000 });

        res.json({ message: "Google 로그인 완료", playtime: formatSeconds(playtimeInSeconds) });
    } catch (err) {
        res.status(500).json({ message: "Google OAuth 실패", error: err.message });
    }
});

// 로컬 로그인
router.post("/sessionLogin", async (req, res) => {
    const { uid, email, name } = req.body;

    try {
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        let playtimeInSeconds = 0;
        const now = admin.firestore.FieldValue.serverTimestamp();

        if (!doc.exists) {
            await userRef.set({
                name: name,
                email,
                provider: "Local",
                playtime: playtimeInSeconds,
                profileImage: DEFAULT_PROFILE_IMAGE,
                ticket: 0,
                items: {[CURRENCY_CREDIT_ID]: 0},   // 코인에서 아이템.크래딧으로 수정
                lastUpdatedAt: now
            }, {merge: true});
        } else {
            const data = doc.data();
            playtimeInSeconds = typeof data.playtime === "number" ? data.playtime : 0;
            await userRef.update({ lastUpdatedAt: now });        // 이제 웹에서 측정하지 않고, 게임 플레이타임만 읽어오는 방식으로 변경
        }

        const token = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "7d" });

        res.cookie("token", token, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 3600000 });
        res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 7 * 24 * 3600000 });

        res.json({ message: "세션 로그인 완료", playtime: formatSeconds(playtimeInSeconds) });
    } catch (err) {
        res.status(500).json({ message: "세션 로그인 실패", error: err.message });
    }
});

// 로그인 상태 확인
router.get("/status", authenticateToken, async (req, res) => {
    try {
        const doc = await db.collection("users").doc(req.user.uid).get();
        if (!doc.exists) return res.status(404).json({ loggedIn: false });
        const user = doc.data();
        if (!user.profileImage) user.profileImage = DEFAULT_PROFILE_IMAGE;
        res.json({
            loggedIn: true,
            user: { uid: req.user.uid, role: req.user.role || "user", ...user },
        });
    } catch {
        res.status(500).json({ loggedIn: false });
    }
});

// 로그아웃
router.post("/signout", authenticateToken, (req, res) => {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.json({ message: "로그아웃 성공!" });
});

// 토큰 갱신
router.post("/refresh-token", (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token 없음" });
    jwt.verify(refreshToken, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Refresh token 유효하지 않음" });
        const newAccessToken = jwt.sign({ email: decoded.email, uid: decoded.uid }, SECRET_KEY, { expiresIn: "1h" });
        res.cookie("token", newAccessToken, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 3600000 });
        res.json({ message: "Access token 갱신 완료" });
    });
});

module.exports = router;