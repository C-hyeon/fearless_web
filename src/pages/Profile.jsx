import { useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuMessageSquareText } from "react-icons/lu";
import "../styles/Modal.scss";
import "../styles/Header.scss";
import cards from "../data/cards.json";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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

const Profile = ({ user, onSignout, onClose, onDelete }) => {
    const [showUpdateProfile, setShowUpdateProfile] = useState(false);
    const [showGameInfo, setShowGameInfo] = useState(false);

    const [showMyPosts, setShowMyPosts] = useState(false);
    const [myPosts, setMyPosts] = useState([]);
    const [myLoading, setMyLoading] = useState(false);
    const [myHasMore, setMyHasMore] = useState(true);
    const [myCursor, setMyCursor] = useState(null);
    const myFirstLoadedRef = useRef(false); 

    const [updateProfile, setUpdateProfile] = useState({name: user.name, password: ""});
    const [validationState, setValidationState] = useState({nameChecked: true, passwordChecked: true});
    const [previewImage, setPreviewImage] = useState(user.profileImage);
    const [resetToDefault, setResetToDefault] = useState(false);

    const cardMap = useMemo(() => {
        const map = new Map();
        (cards?.weapons ?? []).forEach(w => map.set(w.wpId, w));
        return map;
    }, []);

    const ownedWeapons = useMemo(() => {
        const base = Array.isArray(user?.weapons) ? user.weapons : [];
        return base.map(w => {
            const meta = cardMap.get(w.weaponId);
            return {
                weaponId: w.weaponId,
                enhanceLevel: w.enhanceLevel ?? 0,
                breakthroughLevel: w.breakthroughLevel ?? 0,
                title: meta?.title ?? w.weaponId,
                image: meta?.image ?? ""
            };
        });
    }, [user?.weapons, cardMap]);

    const fetchMyPosts = async (reset = false) => {
        try {
            setMyLoading(true);
            const params = new URLSearchParams();
            params.set("limit", "20");
            if (!reset && myCursor) params.set("cursor", String(myCursor));
            const res = await fetch(`${API_BASE}/my_notice?${params.toString()}`, { credentials: "include" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            const next = data.nextCursor ?? null;
            setMyPosts((prev) => (reset ? items : [...prev, ...items]));
            setMyCursor(next);
            setMyHasMore(Boolean(next));
        } catch {} finally {
            setMyLoading(false);
        }
    };

    const openNoticeFromProfile = (id) => {
        window.dispatchEvent(new CustomEvent("open-notice", { detail: { id } }));
        onClose?.();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUpdateProfile(prev => ({ ...prev, [name]: value }));

        if (name === "password") {
            if (value.trim() === "") {
                setValidationState(prev => ({ ...prev, passwordChecked: false }));
            } else {
                evaluatePasswordStrength(value);
            }
        }

        if (name === "name") {
            setValidationState(prev => ({ ...prev, nameChecked: false }));
        }
    };

    const checkDuplicateName = async () => {
        if (!updateProfile.name.trim()) return alert("이름을 입력해주세요.");
        try {
            const res = await fetch(`${API_BASE}/check-name?name=${updateProfile.name}`, {method: "GET", credentials: "include"});
            const data = await res.json();
            if (data.available) {
                alert("사용 가능한 이름입니다.");
                setValidationState(prev => ({ ...prev, nameChecked: true }));
            } else {
                alert("이미 사용 중인 이름입니다.");
                setValidationState(prev => ({ ...prev, nameChecked: false }));
            }
        } catch {
            alert("중복 확인 실패");
        }
    };

    const evaluatePasswordStrength = (password, showAlert = false) => {
        const lengthValid = password.length >= 8 && password.length <= 20;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const isValid = lengthValid && hasUpper && hasLower && hasNumber && hasSpecial;
        setValidationState(prev => ({ ...prev, passwordChecked: isValid }));

        if (showAlert) {
            if (!isValid) {
                alert("비밀번호는 8~20자이며 대소문자, 숫자, 특수문자를 포함해야 합니다.");
            } else {
                alert("적합한 비밀번호입니다.");
            }
        }
    };

    const handleUpdate = async () => {
        if (!validationState.nameChecked) {
            alert("이름 중복 검사를 완료해주세요.");
            return;
        }

        if (user.provider === "Local" && updateProfile.password && !validationState.passwordChecked) {
            alert("비밀번호 보안 조건을 만족해야 합니다.");
            return;
        }

        const formData = new FormData();
        formData.append("name", updateProfile.name);

        const isPasswordChanged = user.provider === "Local" && updateProfile.password;

        if (isPasswordChanged) {
            formData.append("password", updateProfile.password);
        }

        if (resetToDefault) {
            formData.append("resetToDefault", "true");
        } else if (updateProfile.profileImage instanceof File) {
            formData.append("profileImage", updateProfile.profileImage);
        }

        try {
            const res = await fetch(`${API_BASE}/update-profile`, {method: "POST", credentials: "include", body: formData});

            const data = await res.json();
            alert(data.message);

            if (isPasswordChanged) {
                alert("비밀번호가 변경되어 다시 로그인해야 합니다.");
                onSignout();
                return;
            }

            setShowUpdateProfile(false);
            window.location.reload();
        } catch (err) {
            alert("회원정보 수정을 실패했습니다..");
        }
    };

    if (!user) return null;

     const openMyPosts = () => {
        const willOpen = !showMyPosts;
        setShowMyPosts(willOpen);
        setShowGameInfo(false);
        setShowUpdateProfile(false);
        if (willOpen && !myFirstLoadedRef.current) {
            myFirstLoadedRef.current = true;
            fetchMyPosts(true);
        }
    };

    const openGameInfo = () => {
        const willOpen = !showGameInfo;
        setShowGameInfo(willOpen);
        setShowMyPosts(false);
        setShowUpdateProfile(false);
    };

    const openUpdateProfile = () => {
        const willOpen = !showUpdateProfile;
        setShowUpdateProfile(willOpen);
        setShowMyPosts(false);
        setShowGameInfo(false);
    };

    return (
        <div className="overlay">
            <motion.div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.4 }}
            >
                <button className="closeButton" onClick={onClose}>&times;</button>
                <h1 className="master_logo">FearLess</h1>
                <h2 className="profile_title">프로필</h2>

                <div className="profile_content">
                    <div
                        className="user_img"
                        style={{
                        backgroundImage: previewImage.startsWith("blob:") || previewImage.startsWith("http")
                            ? `url(${previewImage})`
                            : `url(${previewImage})`
                        }}
                    />
                    <div className="profile_info">
                        <h2 className="name">{user.name}</h2>
                        <div className="status">
                            <div className="status_row">
                                <span>웹상점티켓</span>
                                <span>{user.ticket ?? 0}</span>
                            </div>
                            <hr className="status_divider" />
                            <div className="status_row">
                                <span>골드</span>
                                <span>{user.items?.currency_credit ?? 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button className="myposts_btn" onClick={openMyPosts}>
                    <LuMessageSquareText size={15} />
                </button>
                <button className="gameinfo_btn" onClick={openGameInfo}>게임정보</button>
                <button className="profileupdate_btn" onClick={openUpdateProfile}>정보수정</button>
                <button className="signout_btn" onClick={onSignout}>로그아웃</button>
                <button className="deleteaccount_btn" onClick={onDelete}>회원탈퇴</button>
                
                <AnimatePresence initial={false}>
                    {showMyPosts && (
                        <motion.div
                            className="myposts_panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="myposts_thead">
                                <div className="cell num">번호</div>
                                <div className="cell title">제목</div>
                                <div className="cell date">작성일자</div>
                            </div>

                            <div className="myposts_tbody">
                                {myLoading && <div className="myposts_loading">불러오는 중…</div>}

                                {!myLoading && myPosts.length === 0 && (
                                <div className="myposts_empty">작성한 게시글이 없습니다.</div>
                                )}

                                {!myLoading &&
                                    myPosts.map((p, idx) => (
                                        <div key={p.id} className="myposts_row" onClick={() => openNoticeFromProfile(p.id)}>
                                            <div className="cell num">{myPosts.length - idx}</div>
                                            <div className="cell title">{p.title}</div>
                                            <div className="cell date">{formatDateShort(p.dateTime)}</div>
                                        </div>
                                    ))
                                }
                                {myHasMore && !myLoading && (
                                    <div className="myposts_more">
                                        <button className="notice_btn" onClick={() => fetchMyPosts(false)}>더 보기</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                    {showGameInfo && (
                        <motion.div
                            className="gameinfo_panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="gameinfo_head">
                                <span className="gameinfo_title">보유 무기</span>
                                <span className="gameinfo_count">{ownedWeapons.length}개</span>
                            </div>

                            <div className="weapons_frame">
                                {ownedWeapons.length === 0 ? (
                                    <div className="empty_weapons">보유 무기가 없습니다.</div>
                                ) : (
                                    <div className="weapons_scroller">
                                        {ownedWeapons.map(w => (
                                            <div className="weapon_card" key={w.weaponId}>
                                                {w.image ? (
                                                    <img className="weapon_img" src={w.image} alt={w.title} />
                                                ) : (
                                                    <div className="weapon_fallback">{w.title}</div>
                                                )}

                                                {/* Hover Overlay */}
                                                <div className="weapon_overlay">
                                                    <div className="weapon_overlay_name">{w.title}</div>
                                                    <div className="weapon_overlay_levels">
                                                        <span className="level_chip">강화 +{w.enhanceLevel}</span>
                                                        <span className="level_chip">돌파 {w.breakthroughLevel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showUpdateProfile && (
                        <motion.div
                            className="update_form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h2 className="update_title">회원정보 수정</h2>

                            <input
                                name="profileImage"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                if (!file.type.startsWith("image/")) {
                                    alert("이미지 파일만 업로드 가능합니다.");
                                    return;
                                }

                                setUpdateProfile((prev) => ({ ...prev, profileImage: file }));
                                setPreviewImage(URL.createObjectURL(file));
                                setResetToDefault(false);
                                }}
                                className="update_input"
                            />
                            <button className="resetimg_btn" onClick={() => {
                                setResetToDefault(true);
                                setUpdateProfile((prev) => ({ ...prev, profileImage: null }));
                                setPreviewImage("https://firebasestorage.googleapis.com/v0/b/fearless-3e591.firebasestorage.app/o/profiles%2FUser_defaultImg.png?alt=media&token=f9a4635c-bfab-4abc-941f-677a1d9cde45");
                                alert("기본 이미지로 변경 요청이 전송됩니다.");
                            }}>기본이미지 변경</button>

                            <div className="update_input-group">
                                <input name="name" type="text" placeholder="이름 / 별명" value={updateProfile.name} onChange={handleChange} className="update_input" />
                                <button className="check_btn" onClick={checkDuplicateName}>✔</button>
                            </div>
                            <div className="update_input-group">
                                <input type="email" value={user.email} readOnly className="update_input blurred" />
                            </div>
                            <div className="update_input-group">
                                <input type="text" value={user.provider} readOnly className="update_input blurred" />
                            </div>

                            {user.provider === "Local" && (
                                <div className="update_input-group">
                                    <input name="password" type="password" placeholder="새 비밀번호(대소문자+숫자+특수문자 포함 8자 이상)" value={updateProfile.password} onChange={handleChange} className="update_input" />
                                    <button className="check_btn" onClick={() => evaluatePasswordStrength(updateProfile.password, true)}>✔</button>
                                </div>
                            )}

                            <button className="update_btn" onClick={handleUpdate}>수정하기</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Profile;
