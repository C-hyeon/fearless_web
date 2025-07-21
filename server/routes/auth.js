const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { db } = require("../firebase");
const formatSeconds = require("../utils/formatSeconds");
const authenticateToken = require("../utils/authenticate");

const SECRET_KEY = process.env.SECRET_KEY;
const DEFAULT_PROFILE_IMAGE = process.env.DEFAULT_PROFILE_IMAGE;
const isProduction = process.env.NODE_ENV === "production";

// Google OAuth 로그인
router.post("/oauth/google", async (req, res) => {
    const { uid, email, name } = req.body;

    try {
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        let playtimeInSeconds = 0;
        const now = new Date().toISOString();

        if (!doc.exists) {
            await userRef.set({
                name,
                email,
                provider: "Google",
                playtime: playtimeInSeconds,
                profileImage: DEFAULT_PROFILE_IMAGE,
                ticket: 0,
                coin: 0,
                lastUpdatedAt: now
            }, {merge: true});
        } else {
            const data = doc.data();

            if (typeof data.playtime === "number" && data.lastUpdatedAt) {
                const last = new Date(data.lastUpdatedAt);
                const nowDate = new Date();
                const elapsed = Math.floor((nowDate - last) / 1000); 

                playtimeInSeconds = data.playtime;

                await userRef.update({ playtime: playtimeInSeconds, lastUpdatedAt: nowDate.toISOString() });
            } else {
                playtimeInSeconds = data.playtime ?? 0;
                await userRef.update({ lastUpdatedAt: new Date().toISOString() });
            }
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
        const now = new Date().toISOString();

        if (!doc.exists) {
            await userRef.set({
                name: name,
                email,
                provider: "Local",
                playtime: playtimeInSeconds,
                profileImage: DEFAULT_PROFILE_IMAGE,
                ticket: 0,
                coin: 0,
                lastUpdatedAt: now
            }, {merge: true});
        } else {
            const data = doc.data();

            if (typeof data.playtime === "number" && data.lastUpdatedAt) {
                const last = new Date(data.lastUpdatedAt);
                const nowDate = new Date(); 
                const elapsed = Math.floor((nowDate - last) / 1000); 

                playtimeInSeconds = data.playtime;

                await userRef.update({ playtime: playtimeInSeconds, lastUpdatedAt: nowDate.toISOString() });
            } else {
                playtimeInSeconds = data.playtime ?? 0;
                await userRef.update({ lastUpdatedAt: new Date().toISOString() });
            }
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
        res.json({ loggedIn: true, user });
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