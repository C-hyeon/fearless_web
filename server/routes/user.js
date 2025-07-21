const express = require("express");
const router = express.Router();
const authenticateToken = require("../utils/authenticate");
const upload = require("../utils/upload");
const { v4: uuidv4 } = require("uuid");
const { db, auth, bucket } = require("../firebase");

// 로컬 회원가입 + 프로필 수정 시 이름/닉네임 중복확인
router.get("/check-name", async (req, res) => {
    const { name } = req.query;
    let uid = null;

    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
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

        // 이름 수정
        if (req.body.name) updateData.name = req.body.name;

        // 비밀번호 수정 (로컬 사용자만)
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

        // 기본 이미지로 변경 요청
        if (req.body.resetToDefault === "true") {
            const defaultImage = process.env.DEFAULT_PROFILE_IMAGE;
            if (!defaultImage) {
                return res.status(500).json({ message: "기본 프로필 이미지가 설정되지 않았습니다." });
            }

            // 이전 이미지 삭제
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
                        console.warn("[⚠️ 이미지 삭제 실패]", oldPath, e.message);
                    });
                }
            }
            updateData.profileImage = defaultImage;

        } else if (req.file && req.file.buffer && req.file.mimetype.startsWith("image/")) {
            // 이전 이미지 삭제
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
                        console.warn("[⚠️ 이미지 삭제 실패]", oldPath, e.message);
                    });
                }
            }

            // 새 이미지 업로드
            const filename = `profiles/${uid}-${Date.now()}.png`;
            const token = uuidv4();
            const blob = bucket.file(filename);

            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype,
                    metadata: {
                        firebaseStorageDownloadTokens: token
                    }
                }
            });

            blobStream.end(req.file.buffer);

            await new Promise((resolve, reject) => {
                blobStream.on("finish", resolve);
                blobStream.on("error", reject);
            });

            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
            updateData.profileImage = imageUrl;
        }

        // Firestore 업데이트
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

// 사용자 계정 탈퇴
router.post("/delete-account", authenticateToken, async (req, res) => {
    try {
        const { uid, email } = req.user;

        // 서브컬렉션 mailbox 전부 삭제
        const mailboxRef = db.collection("users").doc(uid).collection("mailbox");
        const mailboxSnapshot = await mailboxRef.get();
        const batch = db.batch();
        mailboxSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // 사용자 문서 삭제
        await db.collection("users").doc(uid).delete();

        // 삭제 기록 저장
        await db.collection("deletedUsers").doc(uid).set({
            email,
            deletedAt: new Date().toISOString()
        });

        // 인증 계정 삭제
        await auth.deleteUser(uid);

        // 쿠키 제거
        res.clearCookie("token");
        res.clearCookie("refreshToken");

        res.json({ message: "계정 삭제 완료" });
    } catch (err) {
        res.status(500).json({ message: "계정 삭제 실패", error: err.message });
    }
});

module.exports = router;