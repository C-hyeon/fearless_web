import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaUserCircle } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { CiMail } from "react-icons/ci";
import { motion, AnimatePresence } from "framer-motion";

import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";

import Modal from "./Modal";
import Profile from "../pages/Profile";
import "../styles/Header.scss";
import { formatSeconds } from "../utils/formatTime";
import { usePlaytime } from "../utils/PlaytimeContext";

const Header = () => {
    const { currentPlaytime } = usePlaytime();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [signupForm, setSignupForm] = useState({
        name: "",
        email: "",
        password: "",
        code: "",
        verified: false,
    });
    const [signinForm, setSigninForm] = useState({ email: "", password: "" });
    const [users, setUsers] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showMailbox, setShowMailbox] = useState(false);
    const [mailbox, setMailbox] = useState([]);

    const hasPromptedRef = useRef(false);

    const handleOpen = () => setIsModalOpen(true);
    const handleClose = () => {
        setIsModalOpen(false);
        setShowSignup(false);
        setShowProfile(false);
        setShowMailbox(false);
    };

    const handleSignupChange = (e) =>
        setSignupForm({ ...signupForm, [e.target.name]: e.target.value });

    const handleSigninChange = (e) =>
        setSigninForm({ ...signinForm, [e.target.name]: e.target.value });

    const handleSignupSubmit = async () => {
        if (!signupForm.verified) {
        alert("이메일 인증을 완료해주세요!");
        return;
        }

        try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            signupForm.email,
            signupForm.password
        );
        const idToken = await userCredential.user.getIdToken();

        await axios.post(
            "http://localhost:5000/sessionLogin",
            {
            uid: userCredential.user.uid,
            email: signupForm.email,
            },
            { withCredentials: true }
        );

        alert("회원가입 및 로그인 완료!");
        setUsers({ email: signupForm.email });
        setIsModalOpen(false);
        setShowSignup(false);
        window.location.reload();
        } catch (err) {
        console.error(err);
        alert("회원가입 실패: " + err.message);
        }
    };

    const handleSigninSubmit = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                signinForm.email,
                signinForm.password
            );
            const idToken = await userCredential.user.getIdToken();

            const res = await axios.post("http://localhost:5000/sessionLogin", {
                uid: userCredential.user.uid,
                email: signinForm.email,
            }, { withCredentials: true });

            localStorage.setItem("initialPlaytime", res.data.playtime); 

            alert("로그인 완료!");
            setUsers({ email: signinForm.email });
            setIsModalOpen(false);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("로그인 실패: " + err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const res = await axios.post("http://localhost:5000/oauth/google", {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
            }, { withCredentials: true });

            localStorage.setItem("initialPlaytime", res.data.playtime); // ✅ 저장


            alert("Google 로그인 완료");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Google 로그인 실패");
        }
    };

    const checkSigninStatus = async () => {
        try {
        const res = await axios.get("http://localhost:5000/status", {
            withCredentials: true,
        });
        if (res.data.loggedIn) setUsers(res.data.user);
        } catch {
        setUsers(null);
        }
    };

    const handleSignout = async () => {
        const confirmSignout = window.confirm("정말 로그아웃 하시겠습니까?");
        if (!confirmSignout) return;

        try {
        await axios.post(
            "http://localhost:5000/save-playtime",
            { playtime: formatSeconds(currentPlaytime) },
            { withCredentials: true }
        );

        const res = await axios.post(
            "http://localhost:5000/signout",
            {},
            { withCredentials: true }
        );
        document.cookie =
            "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        alert(res.data.message);
        setUsers(null);
        setShowProfile(false);
        window.location.reload();
        } catch {
        alert("로그아웃 실패!");
        }
    };

    useEffect(() => {
        checkSigninStatus();
    }, []);

    useEffect(() => {
        const checkTokenExpiration = async () => {
        if (hasPromptedRef.current) return;

        try {
            await axios.post(
            "http://localhost:5000/refresh-token",
            {},
            { withCredentials: true }
            );
            console.log("세션 자동 연장됨");
        } catch (err) {
            console.error("세션 연장 실패:", err);
        }
        };

        const interval = setInterval(checkTokenExpiration, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const requestVerification = async () => {
        try {
        await axios.post("http://localhost:5000/request-verification", {
            email: signupForm.email,
        });
        alert("인증 코드가 이메일로 전송되었습니다...");
        } catch {
        alert("이메일 전송 실패!");
        }
    };

    const verifyCode = async () => {
        try {
        const res = await axios.post("http://localhost:5000/verify-code", {
            email: signupForm.email,
            code: signupForm.code,
        });
        if (res.data.message === "인증 성공") {
            alert("인증 완료!");
            setSignupForm({ ...signupForm, verified: true });
        }
        } catch {
        alert("인증 실패: 코드가 틀렸습니다!");
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
        "정말 회원탈퇴 하시겠습니까? 이전 상태로 되돌릴 수 없습니다!!"
        );
        if (!confirmDelete) return;

        try {
        const res = await axios.post(
            "http://localhost:5000/delete-account",
            {},
            { withCredentials: true }
        );
        alert(res.data.message);
        setUsers(null);
        setShowProfile(false);
        window.location.reload();
        } catch {
        alert("회원탈퇴에 실패했습니다..");
        }
    };

    const handleOpenMailbox = async () => {
        try {
        const res = await axios.get("http://localhost:5000/mailbox", {
            withCredentials: true,
        });
        setMailbox(res.data.mailbox);
        setShowMailbox(true);
        setIsModalOpen(true);
        } catch {
        alert("우편함을 불러오는데 실패하였습니다...");
        }
    };

    return (
        <header className="main-header">
            <nav className="nav-menu">
                <Link to="/" className="logo">FearLess</Link>
                <Link to="">홈</Link>
                <Link to="/play">게임소개</Link>
                <Link to="/event">이벤트</Link>
                <Link to="/store">상점</Link>
                <span className="download">바로 다운로드</span>

                {users ? (
                <>
                    <span className="mail-icon" onClick={handleOpenMailbox}><CiMail/></span>
                    <span className="user-icon" onClick={()=>setShowProfile(true)}><FaRegCircleUser/></span>
                </>
                ) : (
                <><span className="user-icon" onClick={handleOpen}><FaUserCircle /></span></>
                )}

                <Modal isOpen={isModalOpen} onClose={handleClose}>
                    {showMailbox ? (
                        <>
                            <h1 className="master_logo">FearLess</h1>
                            <h2 className="mail_title">내 우편함</h2>
                            {mailbox.length === 0 ? (
                                <p>수신된 우편이 없습니다.</p>
                            ) : (
                                <table className="mailbox-table">
                                <thead>
                                    <tr>
                                    <th>#</th>
                                    <th>출처</th>
                                    <th>이름</th>
                                    <th>수량</th>
                                    <th>날짜</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mailbox.map((mail, idx) => (
                                    <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td>{mail.source || "시스템"}</td>
                                        <td>{mail.title}</td>
                                        <td>{mail.count ?? 1}</td>
                                        <td>{new Date(mail.date).toLocaleString()}</td>
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            )}
                        </>
                    ) : (
                        <>
                            <h1 className="master_logo">FearLess</h1>
                            <h2 className="signin_title">계정 로그인</h2>
                            <input name="email" type="email" placeholder="이메일" className="signin_input" onChange={handleSigninChange}/>
                            <input name="password" type="password" placeholder="비밀번호" className="signin_input" onChange={handleSigninChange}/>
                            <button className="signin_btn" onClick={handleSigninSubmit}>로그인</button>
                            <button className="google_btn" onClick={handleGoogleLogin}>
                                <FcGoogle size={24}/>
                            </button>
                            <hr className="divider"/>
                            <button className="signup_btn" onClick={()=>setShowSignup(prev => !prev)}>회원가입</button>
                            <AnimatePresence>
                                {showSignup && (
                                <motion.div
                                    className="signup_form"
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                    transition={{duration: 0.4}}
                                >
                                    <h2 className="signup_title">계정 회원가입</h2>
                                    <input name="name" type="text" placeholder="이름" className="signup_input" onChange={handleSignupChange}/>
                                    <input name="email" type="email" placeholder="이메일" className="signup_input" onChange={handleSignupChange}/>
                                    <input name="code" type="text" placeholder="인증 코드 입력" className="signup_input" onChange={(e)=>setSignupForm({...signupForm, code: e.target.value})}/>
                                    <button className="verify_btn" onClick={requestVerification}>인증요청</button>
                                    <button className="verify_btn" onClick={verifyCode}>코드확인</button>
                                    <input name="password" type="password" placeholder="비밀번호" className="signup_input" onChange={handleSignupChange}/>
                                    <button className="signup_btn" onClick={handleSignupSubmit}>회원가입 완료</button>
                                </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </Modal>
            </nav>

            <AnimatePresence>
                {showProfile && (
                    <Profile
                        user={users}
                        onSignout={handleSignout}
                        onClose={handleClose}
                        onDelete={handleDeleteAccount}
                    />
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;
