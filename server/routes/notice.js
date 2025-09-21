const express = require("express");
const router = express.Router();
const { db, admin } = require("../firebase");
const authenticateToken = require("../utils/authenticate");

const FieldValue = admin.firestore.FieldValue;
const NOTICE_COL = "notice";

async function resolveDisplayName(req) {
    const uid = req.user?.uid;
    if (uid) {
        const userDoc = await db.collection("users").doc(uid).get();
        const nameInUsers = userDoc.exists ? userDoc.data().name : null;
        if (nameInUsers && String(nameInUsers).trim()) return String(nameInUsers).trim();
    }
    if (req.user?.name) return String(req.user.name).trim();
    if (req.user?.email) return String(req.user.email.split("@")[0]).trim();
    return "익명";
}


function tsToMillis(v) {
    if (!v) return null;
    if (v._seconds !== undefined) return v._seconds * 1000 + Math.floor((v._nanoseconds || 0) / 1e6);
    if (typeof v.toDate === "function") return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    if (typeof v === "number") return v;
    const maybe = new Date(v).getTime();
    return Number.isNaN(maybe) ? null : maybe;
}

// 게시글 목록 조회
router.get("/view_notice", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
        const cursorMillis = req.query.cursor ? Number(req.query.cursor) : null;

        let q = db.collection(NOTICE_COL).orderBy("dateTime", "desc").limit(limit);

        if (cursorMillis) {q = q.startAfter(new Date(cursorMillis));}

        const snap = await q.get();
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const last = items[items.length - 1];
        const nextCursor = last?.dateTime ? tsToMillis(last.dateTime) : null;

        res.json({ items, nextCursor });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch notices" });
    }
});

// 게시글 추가
router.post("/create_notice", authenticateToken, async (req, res) => {
    const { title, contents } = req.body || {};
    if (!title?.trim() || !contents?.trim()) {
        return res.status(400).json({ message: "Invalid payload" });
    }

    try {
        const uid = req.user?.uid || null;
        const displayName = await resolveDisplayName(req);
        if (!uid) return res.status(401).json({ message: "Unauthorized" });

        const noticeRef = db.collection(NOTICE_COL).doc();
        const myRef = db.collection("users").doc(uid).collection("myNotice").doc(noticeRef.id);

        const payload = {
        title: title.trim(),
        contents: contents.trim(),
        userId: uid,
        userName: displayName,
        dateTime: FieldValue.serverTimestamp(),
        views: 0,
        };

        const batch = db.batch();
        batch.set(noticeRef, payload);
        batch.set(myRef, payload);
        await batch.commit();

        res.status(201).json({ message: "created", id: noticeRef.id });
    } catch (e) {
        res.status(500).json({ message: "Failed to create" });
    }
});

// 내 게시글 목록 조회
router.get("/my_notice", authenticateToken, async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ message: "Unauthorized" });

        const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
        const cursorMillis = req.query.cursor ? Number(req.query.cursor) : null;

        let q = db.collection("users").doc(uid).collection("myNotice").orderBy("dateTime", "desc").limit(limit);

        if (cursorMillis) { q = q.startAfter(new Date(cursorMillis)); }

        const snap = await q.get();
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const last = items[items.length - 1];
        const nextCursor = last?.dateTime ? tsToMillis(last.dateTime) : null;

        res.json({ items, nextCursor });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch my notices" });
    }
});

// 게시글 상세보기
router.get("/:id", async (req, res) => {
    const id = String(req.params.id);
    try {
        const result = await db.runTransaction(async (tx) => {
            const ref = db.collection(NOTICE_COL).doc(id);
            const snap = await tx.get(ref);
            if (!snap.exists) return null;

            const post = snap.data();

            tx.update(ref, { views: admin.firestore.FieldValue.increment(1) });

            if (post.userId) {
                const myRef = db.collection("users").doc(post.userId).collection("myNotice").doc(id);
                tx.set(myRef, { ...post, views: admin.firestore.FieldValue.increment(1) }, { merge: true });
            }
            return { id: snap.id, post };
        });

        if (!result) return res.status(404).json({ message: "Not found" });

        const { id: docId, post } = result;
        res.json({ id: docId, ...post, views: (post.views || 0) + 1 });
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch" });
    }
});

// 게시글 수정
router.patch("/:id", authenticateToken, async (req, res) => {
    const id = String(req.params.id);
    const { title, contents } = req.body || {};
    try {
        const ref = db.collection(NOTICE_COL).doc(id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ message: "Not found" });

        const post = snap.data();
        const isOwner = post.userId && req.user?.uid && post.userId === req.user.uid;
        const isAdmin = req.user?.role === "admin";
        if (!(isOwner || isAdmin)) return res.status(403).json({ message: "Forbidden" });

        const payload = {};
        if (title?.trim()) payload.title = title.trim();
        if (contents?.trim()) payload.contents = contents.trim();
        if (!Object.keys(payload).length) return res.status(400).json({ message: "No changes" });

        const batch = db.batch();
        batch.update(ref, payload);
        const myRef = db
        .collection("users")
        .doc(post.userId)
        .collection("myNotice")
        .doc(id);
        batch.set(myRef, payload, { merge: true });
        await batch.commit();

        res.json({ message: "updated" });
    } catch (e) {
        res.status(500).json({ message: "Failed to update" });
    }
});

// 게시글 삭제
router.delete("/:id", authenticateToken, async (req, res) => {
    const id = String(req.params.id);
    try {
        const ref = db.collection(NOTICE_COL).doc(id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ message: "Not found" });

        const post = snap.data();
        const isOwner = post.userId && req.user?.uid && post.userId === req.user.uid;
        const isAdmin = req.user?.role === "admin";
        if (!(isOwner || isAdmin)) return res.status(403).json({ message: "Forbidden" });

        const batch = db.batch();
        batch.delete(ref);
        const myRef = db
        .collection("users")
        .doc(post.userId)
        .collection("myNotice")
        .doc(id);
        batch.delete(myRef);
        await batch.commit();

        res.json({ message: "deleted" });
    } catch (e) {
        res.status(500).json({ message: "Failed to delete" });
    }
});

module.exports = router;
