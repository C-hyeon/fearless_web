const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const jwt = require("jsonwebtoken"); 
const authenticateToken = require("../utils/authenticate");
const upload = require("../utils/upload");
const { v4: uuidv4 } = require("uuid");
const { db, auth, bucket } = require("../firebase");

const SECRET_KEY = process.env.SECRET_KEY;
const NOTICE_COL = "notice";

// 대량 문서 삭제 쿼리 함수 (300개씩 끊어서 삭제)
async function deleteByQuery(query, pageSize = 300) {
    while (true) {
        const snap = await query.limit(pageSize).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
}

// 대량 문서 업데이트 쿼리 함수 (500개 이하 커밋)
async function updateAllByQuery(query, payload, chunkSize = 450) {
    const snap = await query.get();
    if (snap.empty) return;

    let batch = db.batch();
    let count = 0;
    const commits = [];

    for (const doc of snap.docs) {
        batch.update(doc.ref, payload);
        count++;
        if (count >= chunkSize) {commits.push(batch.commit()); batch = db.batch(); count = 0;}
    }
    if (count > 0) commits.push(batch.commit());
    await Promise.all(commits);
}

// 이름 변경 시 게시물 작성자 반영
async function propagateUserName(uid, newName) {
    await updateAllByQuery(db.collection(NOTICE_COL).where("userId", "==", uid), { userName: newName });
    await updateAllByQuery(db.collection("users").doc(uid).collection("myNotice"), { userName: newName });
}

// 로컬 회원가입 + 프로필 수정 시 이름/닉네임 중복확인
router.get("/check-name", async (req, res) => {
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
router.get("/check-email", async (req, res) => {
    const { email } = req.query;
    const snapshot = await db.collection("users").where("email", "==", email).get();
    res.json({ available: snapshot.empty });
});

// 회원정보 수정
router.post("/update-profile", authenticateToken, upload.single("profileImage"), async (req, res) => {
    try {
        const uid = req.user.uid;
        const userRef = db.collection("users").doc(uid);
        const updateData = {};
        const userRecord = await auth.getUser(uid);
        const providerId = userRecord.providerData[0]?.providerId || "unknown";
        const beforeSnap = await userRef.get();
        const prevName = beforeSnap.data()?.name || "";

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

        if (
            typeof updateData.name === "string" &&
            updateData.name.trim() &&
            updateData.name.trim() !== prevName
        ) {await propagateUserName(uid, updateData.name.trim());}

        res.json({
            message: "회원정보가 성공적으로 수정되었습니다.",
            profileImage: updateData.profileImage
        });

    } catch (err) {
        console.error("회원정보 수정 실패:", err);
        res.status(500).json({ message: "회원정보 수정 실패", error: err.message });
    }
});

// 사용자 계정 탈퇴
router.post("/delete-account", authenticateToken, async (req, res) => {
    try {
        const { uid, email } = req.user;

        await deleteByQuery(db.collection("users").doc(uid).collection("mailbox"));
        await deleteByQuery(db.collection("users").doc(uid).collection("myNotice"));
        await deleteByQuery(db.collection(NOTICE_COL).where("userId", "==", uid));
        await db.collection("users").doc(uid).delete();
        await db.collection("deletedUsers").doc(uid).set({email, deletedAt: admin.firestore.FieldValue.serverTimestamp(),});
        await auth.deleteUser(uid);

        res.clearCookie("token");
        res.clearCookie("refreshToken");

        res.json({ message: "계정 삭제 완료" });
    } catch (err) {
        res.status(500).json({ message: "계정 삭제 실패", error: err.message });
    }
});

module.exports = router;