require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");    // serverTimestamp 수정
const { db, auth, bucket } = require("./firebase");
const { sendVerificationEmail } = require("./mailer");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY;
const isProduction = process.env.NODE_ENV === "production";

const DEFAULT_PROFILE_IMAGE = process.env.DEFAULT_PROFILE_IMAGE;

const CURRENCY_CREDIT_ID = "currency_credit";       // 크래딧 아이템 ID 수정
const CURRENCY_TICKET_ID = "currency_ticket";       // 티켓 아이템 ID 수정

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}


// 00:00:00 형식으로 변환 함수
function formatSeconds(seconds) {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
}


// Google OAuth 로그인
app.post("/oauth/google", async (req, res) => {
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

        res.json({ message: "Google 로그인 완료", playtime: formatSeconds(playtimeInSeconds) });
    } catch (err) {
        res.status(500).json({ message: "Google OAuth 실패", error: err.message });
    }
});


// 로컬 회원가입 + 프로필 수정 시 이름/닉네임 중복확인
app.get("/check-name", async (req, res) => {
    const { name } = req.query;
    let uid = null;

    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.verify(token, SECRET_KEY);
            uid = decoded.uid;
        }
    } catch (e) {}

    const snapshot = await db.collection("users").where("name", "==", name).get();
    const isDuplicate = snapshot.docs.some(doc => doc.id !== uid);
    res.json({ available: !isDuplicate });
});

// 로컬 회원가입 시 이메일 중복확인
app.get("/check-email", async (req, res) => {
    const { email } = req.query;
    const snapshot = await db.collection("users").where("email", "==", email).get();
    res.json({ available: snapshot.empty });
});


// 클라이언트 Firebase 로그인 후 세션 토큰 발급
app.post("/sessionLogin", async (req, res) => {
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


// 인증코드 발송
app.post("/request-verification", async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

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
            if (req.body.password.length < 8 || req.body.password.length > 20) {
                return res.status(400).json({ message: "비밀번호는 8자 이상 20자 이하여야 합니다." });
            }

            const hasUpper = /[A-Z]/.test(req.body.password);
            const hasLower = /[a-z]/.test(req.body.password);
            const hasNumber = /[0-9]/.test(req.body.password);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(req.body.password);

            if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
                return res.status(400).json({ message: "비밀번호는 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다." });
            }
            await auth.updateUser(uid, { password: req.body.password });
        }

        if (req.body.resetToDefault === "true") {
            const defaultImage = process.env.DEFAULT_PROFILE_IMAGE;
            if (!defaultImage) {
                return res.status(500).json({ message: "기본 프로필 이미지가 설정되지 않았습니다." });
            }

            const userSnapshot = await userRef.get();
            const previousImage = userSnapshot.data()?.profileImage;
            if (
                previousImage &&
                previousImage.includes("firebasestorage.googleapis.com") &&
                !previousImage.includes("User_defaultImg.png")
            ) {
                const match = previousImage.match(/\/o\/(.*?)\?/);
                if (match && match[1]) {
                    const oldPath = decodeURIComponent(match[1]);
                    await bucket.file(oldPath).delete().catch((e) => {
                        console.warn("이미지 삭제 실패", oldPath, e.message);
                    });
                }
            }
            updateData.profileImage = defaultImage;

        } else if (req.file && req.file.buffer && req.file.mimetype.startsWith("image/")) {
            const userSnapshot = await userRef.get();
            const previousImage = userSnapshot.data()?.profileImage;
            if (
                previousImage &&
                previousImage.includes("firebasestorage.googleapis.com") &&
                !previousImage.includes("User_defaultImg.png")
            ) {
                const match = previousImage.match(/\/o\/(.*?)\?/);
                if (match && match[1]) {
                    const oldPath = decodeURIComponent(match[1]);
                    await bucket.file(oldPath).delete().catch((e) => {
                        console.warn("이미지 삭제 실패", oldPath, e.message);
                    });
                }
            }

            const filename = `profiles/${uid}-${Date.now()}.png`;
            const token = uuidv4();
            const blob = bucket.file(filename);

            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype,
                    metadata: {
                        firebaseStorageDownloadTokens: token,
                    },
                },
            });

            blobStream.end(req.file.buffer);

            await new Promise((resolve, reject) => {
                blobStream.on("finish", resolve);
                blobStream.on("error", reject);
            });

            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
            updateData.profileImage = imageUrl;
        }

        if (Object.keys(updateData).length > 0) {
            await userRef.update(updateData);
        }

        res.json({
            message: "회원정보가 성공적으로 수정되었습니다.",
            profileImage: updateData.profileImage
        });

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

        const mailboxRef = db.collection("users").doc(uid).collection("mailbox");
        const mailboxSnapshot = await mailboxRef.get();
        const batch = db.batch();
        mailboxSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        await db.collection("users").doc(uid).delete();

        await db.collection("deletedUsers").doc(uid).set({
            email,
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await auth.deleteUser(uid);

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

// 티켓/코인 포함 우편함 조회
app.get("/mailbox-all", authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection("users").doc(req.user.uid).collection("mailbox").orderBy("timestamp", "desc").get();   // timestamp 추가 수정
        const mailbox = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ mailbox });
    } catch (err) {
        res.status(500).json({ message: "전체 우편함 로드 실패", error: err.message });
    }
});

// 티켓/코인 제외 우편함 조회
app.get("/mailbox", authenticateToken, async (req, res) => {
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


// 우편함 추가(수정)
app.post("/mailbox", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);

        let { title, message, items } = req.body;

        if (!Array.isArray(items)) {
            const { content, count, type, itemID } = req.body;
            title = title ?? req.body.title;
            message = message ?? content ?? "";
            const mappedItemID =
                type === "coin"
                ? CURRENCY_CREDIT_ID
                : type === "ticket"
                ? CURRENCY_TICKET_ID
                : itemID || "unknown_item";
            const mappedCount = typeof count === "number" ? count : 1;
            items = [{ itemID: mappedItemID, count: mappedCount }];
        }

        const safeItems = (items || [])
            .filter((i) => i && typeof i.count === "number" && i.count > 0 && typeof i.itemID === "string")
            .map((i) => ({ itemID: i.itemID, count: i.count }));

        if (!title || !message || safeItems.length === 0) {
            return res.status(400).json({ message: "title, message, items는 필수입니다." });
        }

        const mailId = uuidv4();
        const mailData = {
            title,
            message,
            items: safeItems,
            isClaimed: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        await userRef.collection("mailbox").doc(mailId).set(mailData);

        res.json({ message: "우편 발송 완료", id: mailId });
    } catch (err) {
        res.status(500).json({ message: "우편 발송 실패", error: err.message });
    }
});


// 상점 아이템 구매(수정)
app.post("/purchase", authenticateToken, async (req, res) => {
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


// 플레이타임 저장 (수정)
app.post("/save-playtime", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);
        const snap = await userRef.get();
        const data = snap.data() || {};
        const playtimeInSeconds = typeof data.playtime === "number" ? data.playtime : 0;

        res.json({ message: "플레이타임은 읽기 전용입니다.", playtime: formatSeconds(playtimeInSeconds) });
    } catch (err) {
        res.status(500).json({ message: "플레이타임 조회 실패", error: err.message });
    }
});



// 세션 유지용 ping 측정 (수정)
app.post("/update-last-activity", authenticateToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.user.uid);
        await userRef.update({ lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ message: "활동 시간 갱신 완료(플레이타임 미변경)" });
    } catch (err) {
        res.status(500).json({ message: "갱신 실패", error: err.message });
    }
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 서버 실행중 : http://localhost:${PORT}`);
});
