import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "../styles/Notice.scss";
import Wrapper from "../components/Wrapper";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ENDPOINTS = {
    LIST: `${API_BASE}/view_notice`,
    CREATE: `${API_BASE}/create_notice`,
    DETAIL: (id) => `${API_BASE}/${id}`,
    STATUS: `${API_BASE}/status`,
};

const toDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (v?._seconds !== undefined) return new Date(v._seconds * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const pad2 = (n) => String(n).padStart(2, "0");

const formatDateShort = (v) => {
    const d = toDate(v);
    if (!d) return "-";
    const yy = String(d.getFullYear()).slice(-2);
    return `${yy}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
};

const formatDateTime = (v) => {
    const d = toDate(v);
    if (!d) return "-";
    const yyyy = d.getFullYear();
    return `${yyyy}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const Notice = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [openWrite, setOpenWrite] = useState(false);
    const [title, setTitle] = useState("");
    const [contents, setContents] = useState("");
    const [openDetail, setOpenDetail] = useState(false);
    const [detail, setDetail] = useState(null);
    const [openEdit, setOpenEdit] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContents, setEditContents] = useState("");
    const [me, setMe] = useState(null);
    const [error, setError] = useState("");

    const header = useMemo(() => ["번호", "제목", "작성자", "작성일", "조회수"], []);

    const fetchList = async (reset = false) => {
        try {
            setError("");
            const params = new URLSearchParams();
            params.set("limit", "20");
            if (!reset && cursor) params.set("cursor", String(cursor));

            const res = await fetch(`${ENDPOINTS.LIST}?${params.toString()}`, {credentials: "include",});
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const items = Array.isArray(data.items) ? data.items : [];
            const next = data.nextCursor ?? null;

            setPosts((prev) => (reset ? items : [...prev, ...items]));
            setCursor(next);
            setHasMore(Boolean(next));
            setLoading(false);
        } catch (e) {
            setLoading(false);
            setError("목록을 불러오지 못했습니다. 서버 주소/엔드포인트를 확인하세요.");
        }
    };

    useEffect(() => {
        fetchList(true);
    }, []);
    
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(ENDPOINTS.STATUS, { credentials: "include" });
                if (!res.ok) return;
                const data = await res.json();
                if (data?.loggedIn && data?.user) setMe(data.user);
            } catch {}
        })();
    }, []);

    const isLoggedIn = !!me?.uid;
    const handleOpenWrite = () => {
        if (!isLoggedIn) {
            alert("로그인 후 이용 가능합니다.");
            return;
        }
        setOpenWrite(true);
    };

    const submitPost = async (e) => {
        e.preventDefault();
        if (!isLoggedIn) {
            alert("로그인 후 이용 가능합니다.");
            return;
        }
        if (!title.trim() || !contents.trim()) return;

        const res = await fetch(ENDPOINTS.CREATE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                title: title.trim(),
                contents: contents.trim(),
            }),
        });
        if (!res.ok) {
            setError("글 등록에 실패했습니다. 로그인/권한 또는 서버 상태를 확인하세요.");
            return;
        }

        setTitle("");
        setContents("");
        setOpenWrite(false);
        setLoading(true);
        setCursor(null);
        await fetchList(true);
    };

    const openDetailFetch = async (post) => {
        const id = String(post.id);
        try {
            const res = await fetch(ENDPOINTS.DETAIL(id), { credentials: "include" });
            if (!res.ok) {
                if (res.status === 404) alert("글이 존재하지 않거나 삭제되었습니다.");
                else alert("상세를 불러오지 못했습니다.");
                return;
            }
            const data = await res.json();
            setDetail(data);
            setOpenDetail(true);
            setPosts((prev) =>
                prev.map((p) => (String(p.id) === id ? { ...p, views: (p.views || 0) + 1 } : p))
            );
        } catch {
            alert("상세 요청 중 네트워크 오류가 발생했습니다.");
        }
    };

    const openDetailById = async(id) => {
        try {
            const res = await fetch(ENDPOINTS.DETAIL(String(id)), { credentials: "include" });
            if (!res.ok) {
                if (res.status === 404) alert("글이 존재하지 않거나 삭제되었습니다.");
                else alert("상세를 불러오지 못했습니다.");
                return;
            }
            const data = await res.json();
            setDetail(data);
            setOpenDetail(true);
            setPosts((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, views: (p.views || 0) + 1 } : p)));
        } catch {
            alert("상세 요청 중 네트워크 오류가 발생했습니다.");
        }
    };

    useEffect(() => {
        const handler = (e) => {
            const id = e?.detail?.id;
            if (id) openDetailById(id);
        };
        window.addEventListener("open-notice", handler);
        return () => window.removeEventListener("open-notice", handler);
    }, []);

    const isOwner = useMemo(() => {
        if (!detail?.userId || !me?.uid) return false;
        return String(detail.userId) === String(me.uid);
    }, [detail?.userId, me?.uid]);

    const handleOpenEdit = () => {
        if (!detail) return;
        if (!isOwner) return;
        setOpenDetail(false);
        setTimeout(() => {
        setEditId(detail.id);
        setEditTitle(detail.title || "");
        setEditContents(detail.contents || "");
        setOpenEdit(true);
        }, 180);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editId || !editTitle.trim() || !editContents.trim()) return;

        const res = await fetch(ENDPOINTS.DETAIL(editId), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title: editTitle.trim(), contents: editContents.trim() }),
        });
        if (!res.ok) {
            alert("수정에 실패했습니다.");
            return;
        }
        setOpenEdit(false);
        setEditId(null);
        setEditTitle("");
        setEditContents("");
        await fetchList(true);
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (!confirm("정말 삭제할까요?")) return;

        const res = await fetch(ENDPOINTS.DETAIL(id), {method: "DELETE", credentials: "include",});
        if (!res.ok) {
            alert("삭제에 실패했습니다.");
            return;
        }
        setOpenDetail(false);
        setDetail(null);
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    };

    return (
        <Wrapper>
            <div className="notice_container">
                <div className="notice_inner">
                    {error && <div className="notice_error">{error}</div>}
                    <div className="notice_top">
                        <h1>자유게시판</h1>
                        {isLoggedIn ? (
                            <button className="notice_btn primary" onClick={handleOpenWrite}>글쓰기</button>
                        ) : (
                            <span className="notice_hint" title="로그인 후 이용 가능합니다.">
                                로그인 후 게시글을 작성할 수 있습니다.
                            </span>
                        )}
                    </div>

                    <div className="notice_table">
                        <div className="notice_thead">
                            {header.map((h) => (
                                <div key={h} className="cell">{h}</div>
                            ))}
                        </div>

                        <div className="notice_tbody">
                            {loading && <div className="notice_empty">불러오는 중…</div>}
                            {!loading && posts.length === 0 && (
                                <div className="notice_empty">등록된 게시글이 없습니다.</div>
                            )}
                            {!loading && posts.map((p, idx) => (
                                <div key={p.id} className="notice_row">
                                    <div className="cell number">{posts.length - idx}</div>
                                    <div
                                        className="cell title clickable"
                                        title="상세 보기"
                                        onClick={() => openDetailFetch(p)}
                                    >{p.title}</div>
                                    <div className="cell author">{p.userName}</div>
                                    <div className="cell date">{formatDateShort(p.dateTime)}</div>
                                    <div className="cell views">{p.views ?? 0}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {hasMore && !loading && (
                        <div className="notice_more">
                            <button className="notice_btn" onClick={() => fetchList(false)}>더 보기</button>
                        </div>
                    )}
                </div>
                
                <AnimatePresence>
                    {openWrite && (
                        <motion.div
                            className="notice_modal"
                            role="dialog"
                            aria-modal="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setOpenWrite(false)}
                        >
                            <motion.div
                                className="notice_modal_card"
                                initial={{ y: -40, opacity: 0, scale: 0.98 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: -24, opacity: 0, scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.6 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal_header">
                                    <h2>새 글 작성</h2>
                                    <button
                                        className="icon_btn"
                                        aria-label="닫기"
                                        onClick={() => setOpenWrite(false)}
                                    >✕</button>
                                </div>

                                <form className="modal_body" onSubmit={submitPost}>
                                    <label className="field">
                                        <span>제목</span>
                                        <input
                                            type="text"
                                            maxLength={120}
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="제목을 입력하세요"
                                            required
                                        />
                                    </label>

                                    <label className="field">
                                        <span>내용</span>
                                        <textarea
                                            rows={10}
                                            value={contents}
                                            onChange={(e) => setContents(e.target.value)}
                                            placeholder="내용을 입력하세요"
                                            required
                                        />
                                    </label>

                                    <div className="modal_footer">
                                        <button type="button" className="notice_btn" onClick={() => setOpenWrite(false)}>취소</button>
                                        <button type="submit" className="notice_btn primary">등록</button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <AnimatePresence>
                    {openDetail && detail && (
                        <motion.div
                            className="notice_modal"
                            role="dialog"
                            aria-modal="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setOpenDetail(false)}
                        >
                            <motion.div
                                className="notice_modal_card"
                                key={detail.id || "detail"}
                                initial={{ y: -40, opacity: 0, scale: 0.98 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: -24, opacity: 0, scale: 0.98 }}
                                transition={{type: "spring", stiffness: 520, damping: 36, mass: 0.6}}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal_header">
                                    <h2 className="detail_title">{detail.title}</h2>
                                    <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                                        {isOwner && (
                                            <>
                                                <button className="notice_btn" onClick={handleOpenEdit}>수정</button>
                                                <button className="notice_btn" onClick={() => handleDelete(detail.id)}>삭제</button>
                                            </>
                                        )}
                                        <button className="icon_btn" aria-label="닫기" onClick={() => setOpenDetail(false)}>✕</button>
                                    </div>
                                </div>

                                <div className="detail_meta">
                                    <span>&nbsp;작성자&nbsp;&nbsp; | &nbsp;&nbsp;{detail.userName}</span>
                                    <span>&nbsp;작성일&nbsp;&nbsp; | &nbsp;&nbsp;{formatDateTime(detail.dateTime)}</span>
                                    <span>&nbsp;조회수&nbsp;&nbsp; | &nbsp;&nbsp;{detail.views}</span>
                                </div>

                                <div className="detail_contents">
                                    {String(detail.contents || "").split("\n").map((line, i) => (<p key={i}>{line}</p>))}
                                </div>

                                <div className="modal_footer">
                                    <button className="notice_btn" onClick={() => setOpenDetail(false)}>닫기</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {openEdit && (
                        <motion.div
                            className="notice_modal"
                            role="dialog"
                            aria-modal="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setOpenEdit(false)}
                        >
                            <motion.div
                                className="notice_modal_card"
                                initial={{ y: -40, opacity: 0, scale: 0.98 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: -24, opacity: 0, scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.6 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal_header">
                                <h2>게시글 수정</h2>
                                <button className="icon_btn" aria-label="닫기" onClick={() => setOpenEdit(false)}>✕</button>
                                </div>

                                <form className="modal_body" onSubmit={submitEdit}>
                                    <label className="field">
                                        <span>제목</span>
                                        <input
                                            type="text"
                                            maxLength={120}
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="제목을 입력하세요"
                                            required
                                        />
                                    </label>

                                    <label className="field">
                                        <span>내용</span>
                                        <textarea
                                            rows={10}
                                            value={editContents}
                                            onChange={(e) => setEditContents(e.target.value)}
                                            placeholder="내용을 입력하세요"
                                            required
                                        />
                                    </label>

                                    <div className="modal_footer">
                                        <button type="button" className="notice_btn" onClick={() => setOpenEdit(false)}>취소</button>
                                        <button type="submit" className="notice_btn primary">수정</button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Wrapper>
    );
};

export default Notice;