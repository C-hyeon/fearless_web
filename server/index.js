require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { db, auth, bucket } = require("./firebase");
const { sendVerificationEmail } = require("./mailer");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY;
const isProduction = process.env.NODE_ENV === "production";

const DEFAULT_PROFILE_IMAGE = process.env.DEFAULT_IMAGE;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const storage = multer.memoryStorage();
const upload = multer({ storage });

function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Google OAuth 로그인
app.post("/oauth/google", async (req, res) => {
    const { uid, email, name } = req.body;
    try {
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            await userRef.set({
                name,
                email,
                provider: "Google",
                playtime: "00:00:00",
                profileImage: DEFAULT_PROFILE_IMAGE,
                claimedRewards: [],
                ticket: 0,
                coin: 0,
                lastUpdatedAt: new Date().toISOString()
            });
        } else {
            await userRef.update({
                lastUpdatedAt: new Date().toISOString()
            });
        }
        const token = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "7d" });
        res.cookie("token", token, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 3600000 });
        res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 7 * 24 * 3600000 });
        res.json({
            message: "Google 로그인 완료",
            playtime: doc.data().playtime || "00:00:00"
        });
    } catch (err) {
        res.status(500).json({ message: "Google OAuth 실패", error: err.message });
    }
});

// 클라이언트 Firebase 로그인 후 세션 토큰 발급
app.post("/sessionLogin", async (req, res) => {
    const { uid, email } = req.body;

    try {
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            await userRef.set({
                name: "로컬회원",
                email,
                provider: "Local",
                playtime: "00:00:00",
                profileImage: DEFAULT_PROFILE_IMAGE,
                claimedRewards: [],
                ticket: 0,
                coin: 0,
                lastUpdatedAt: new Date().toISOString()
            });
        } else {
            await userRef.update({
                lastUpdatedAt: new Date().toISOString()
            });
        }

        const token = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ email, uid }, SECRET_KEY, { expiresIn: "7d" });

        res.cookie("token", token, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 3600000 });
        res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 7 * 24 * 3600000 });
        res.json({
            message: "세션 로그인 완료",
            playtime: doc.data().playtime || "00:00:00"
        });
    } catch (err) {
        res.status(500).json({ message: "세션 로그인 실패", error: err.message });
    }
});

// 인증코드 발송
app.post("/request-verification", async (req, res) => {
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

// 인증코드 확인
app.post("/verify-code", async (req, res) => {
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


// 로그인 상태 확인
app.get("/status", authenticateToken, async (req, res) => {
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

// 회원정보 수정 라우터
app.post("/update-profile", authenticateToken, upload.single("profileImage"), async (req, res) => {
    try {
        const uid = req.user.uid;
        const userRef = db.collection("users").doc(uid);
        const updateData = {};

        const userRecord = await auth.getUser(uid);
        const providerId = userRecord.providerData[0]?.providerId || "unknown";

        if (req.body.name) updateData.name = req.body.name;

        if (req.body.password) {
            if (providerId !== "password") {
                return res.status(400).json({ message: "소셜 로그인 사용자는 비밀번호를 수정할 수 없습니다." });
            }
            if (req.body.password.length < 6) {
                return res.status(400).json({ message: "비밀번호는 최소 6자 이상이어야 합니다." });
            }
            await auth.updateUser(uid, { password: req.body.password });
        }

        if (req.body.resetToDefault === "true") {
            updateData.profileImage = DEFAULT_PROFILE_IMAGE;
        }

        if (req.file) {
            const filename = `profiles/${uid}-${Date.now()}`;
            const blob = bucket.file(filename);
            const blobStream = blob.createWriteStream({ metadata: { contentType: req.file.mimetype } });
            blobStream.end(req.file.buffer);

            await new Promise((resolve, reject) => {
                blobStream.on("finish", resolve);
                blobStream.on("error", reject);
            });

            await blob.makePublic(); // ⬅️ 이미지 공개 처리 추가

            const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
            updateData.profileImage = imageUrl;
        }

        if (Object.keys(updateData).length > 0) {
            await userRef.update(updateData);
        }

        res.json({ message: "회원정보가 성공적으로 수정되었습니다.", profileImage: updateData.profileImage });
    } catch (err) {
        console.error("회원정보 수정 실패:", err);
        res.status(500).json({ message: "회원정보 수정 실패", error: err.message });
    }
});

// 로그아웃
app.post("/signout", authenticateToken, (req, res) => {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.json({ message: "로그아웃 성공!" });
});

// 토큰 갱신
app.post("/refresh-token", (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token 없음" });
    jwt.verify(refreshToken, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Refresh token 유효하지 않음" });
        const newAccessToken = jwt.sign({ email: decoded.email, uid: decoded.uid }, SECRET_KEY, { expiresIn: "1h" });
        res.cookie("token", newAccessToken, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 3600000 });
        res.json({ message: "Access token 갱신 완료" });
    });
});

// 사용자 탈퇴 + Firestore 및 Auth 삭제
app.post("/delete-account", authenticateToken, async (req, res) => {
    try {
        const { uid, email } = req.user;

        // 1. 서브컬렉션 mailbox 전부 삭제
        const mailboxRef = db.collection("users").doc(uid).collection("mailbox");
        const mailboxSnapshot = await mailboxRef.get();
        const batch = db.batch();
        mailboxSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // 2. 사용자 문서 삭제
        await db.collection("users").doc(uid).delete();

        // 3. 삭제 기록 저장
        await db.collection("deletedUsers").doc(uid).set({
            email,
            deletedAt: new Date().toISOString()
        });

        // 4. 인증 계정 삭제
        await auth.deleteUser(uid);

        // 5. 쿠키 제거
        res.clearCookie("token");
        res.clearCookie("refreshToken");

        res.json({ message: "계정 삭제 완료" });
    } catch (err) {
        res.status(500).json({ message: "계정 삭제 실패", error: err.message });
    }
});

// 아이템 조회 (Firestore 기반)
app.get("/items", async (req, res) => {
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


// 우편함 조회
app.get("/mailbox", authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection("users").doc(req.user.uid).collection("mailbox").get();
        const mailbox = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ mailbox });
    } catch (err) {
        res.status(500).json({ message: "우편함 로드 실패", error: err.message });
    }
});

// 우편함 추가
app.post("/mailbox", authenticateToken, async (req, res) => {
    const { title, content, count = 1 } = req.body;

    const isGold = title.includes("골드") || title.toLowerCase().includes("coin");
    const isTicket = title.includes("티켓") || title.toLowerCase().includes("ticket");

    try {
        const userRef = db.collection("users").doc(req.user.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        if (isGold || isTicket) {
            const updateData = {};
            if (isGold) updateData.coin = (userData.coin || 0) + count;
            if (isTicket) updateData.ticket = (userData.ticket || 0) + count;

            // 수령한 보상 목록에 추가
            const claimed = new Set(userData.claimedRewards || []);
            claimed.add(title);
            updateData.claimedRewards = Array.from(claimed);

            await userRef.update(updateData);

            return res.json({ message: `${isGold ? "골드" : "티켓"}가 프로필에 직접 추가되었습니다.` });
        }

        // 일반 아이템은 우편함에 저장
        const mailId = uuidv4();
        const mailData = {
            title,
            content,
            source: "이벤트",
            count,
            date: new Date().toISOString()
        };

        await userRef.collection("mailbox").doc(mailId).set(mailData);
        res.json({ message: "우편함으로 보상 전송 완료" });
    } catch (err) {
        res.status(500).json({ message: "보상 수령 실패", error: err.message });
    }
});

// 상점 아이템 구매
app.post("/purchase", authenticateToken, async (req, res) => {
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

// 플레이타임 저장
app.post("/save-playtime", authenticateToken, async (req, res) => {
    const { playtime } = req.body;
    try {
        await db.collection("users").doc(req.user.uid).update({ playtime });
        res.json({ message: "플레이타임 저장 완료" });
    } catch (err) {
        res.status(500).json({ message: "플레이타임 저장 실패", error: err.message });
    }
});

// 서버 Ping 측정
app.post("/update-last-activity", authenticateToken, async (req, res) => {
    try {
        await db.collection("users").doc(req.user.uid).update({
            lastUpdatedAt: new Date().toISOString(),
            playtime: req.body.playtime  // ✅ 함께 저장
        });
        res.json({ message: "활동 시간 갱신 완료" });
    } catch (err) {
        res.status(500).json({ message: "갱신 실패", error: err.message });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 🚀 서버 실행 중: http://localhost:${PORT}`);
});
