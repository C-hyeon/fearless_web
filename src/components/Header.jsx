import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaUserCircle } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { CiMail } from "react-icons/ci";
import { motion, AnimatePresence } from "framer-motion";

import Modal from "./Modal";
import Profile from "../pages/Profile";
import "../styles/Header.scss";
import { formatSeconds } from "../utils/formatTime";
import { usePlaytime } from "../utils/PlaytimeContext";

import Cookies from "js-cookie";

const Header = () => {
    const { currentPlaytime } = usePlaytime();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [signupForm, setSignupForm] = useState({
        name: "", 
        email: "", 
        password: "",
        code: "",
        verified: false
    });
    const [signinForm, setSigninForm] = useState({email: "", password: ""});
    const [users, setUsers] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showMailbox, setShowMailbox] = useState(false);
    const [mailbox, setMailbox] = useState([]);

    const handleOpen = () => setIsModalOpen(true);
    const handleClose = () => {
        setIsModalOpen(false);
        setShowSignup(false);
        setShowProfile(false);
    };

    // 계정 회원가입 - 서버
    const handleSignupChange = (e) => setSignupForm({
        ...signupForm, [e.target.name]: e.target.value
    });

    const handleSignupSubmit = async () => {
        if(!signupForm.verified) {
            alert("이메일 인증을 완료해주세요!");
            return;
        }

        try{
            const res = await axios.post("http://localhost:5000/signup", signupForm, {
                withCredentials: true,
            });
            alert(res.data.message);
            setShowSignup(false);
        } catch(err){
            alert(err.response?.data?.message || "회원가입 실패");
        }
    };

    // 계정 로그인 - 서버
    const handleSigninChange = (e) => setSigninForm({
        ...signinForm, [e.target.name]: e.target.value
    });

    const handleSigninSubmit = async () => {
        try{
            const res = await axios.post("http://localhost:5000/signin", signinForm, {
                withCredentials: true
            });
            alert(res.data.message);
            setUsers(res.data.user);
            setIsModalOpen(false);
            window.location.reload();
        } catch(err){
            alert(err.response?.data?.message || "로그인 실패");
        }
    };

    // 계정 로그인 상태 확인 - 서버
    const checkSigninStatus = async () => {
        try {
            const res = await axios.get("http://localhost:5000/status", {
                withCredentials: true
            });
            if(res.data.loggedIn) setUsers(res.data.user);
        } catch (err){
            setUsers(null);         // 인증 실패 시 로그아웃 처리
        }
    };

    // 계정 로그아웃 - 서버
    const handleSignout = async () => {
        const confirmSignout = window.confirm("정말 로그아웃 하시겠습니까?");
        if(!confirmSignout) return;

        try {
            // 저장할 시간 전송
            await axios.post("http://localhost:5000/save-playtime", {
                playtime: formatSeconds(currentPlaytime)
            }, {withCredentials: true});

            // 사용자 로그아웃
            const res = await axios.post("http://localhost:5000/signout", {}, {
                withCredentials: true
            });
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            alert(res.data.message);
            setUsers(null);
            setShowProfile(false);
            window.location.reload();
        } catch (err){
            alert("로그아웃 실패!");
        }
    };

    useEffect(()=>{checkSigninStatus();}, []);

    useEffect(() => {
        const checkTokenRefresh = () => {
            const token = Cookies.get("token");
            if(!token) return;

            // JWT 디코딩
            const payload = JSON.parse(atob(token.split(".")[1]));
            const exp = payload.exp * 1000;     // 만료시간 ms
            const now = Date.now();
            const timeLeft = exp - now;

            // 5분 이하 남으면 알림
            if(timeLeft < 5 * 60 * 1000) {
                const confirmed = window.confirm("로그인 세션이 곧 만료됩니다. 연장하시겠습니까?");
                if (confirmed) {
                    axios.post("http://localhost:5000/refresh-token", {}, {
                        withCredentials: true
                    }).then(res => {
                        alert("로그인 세션이 연장되었습니다!");
                    }).catch(() => {
                        alert("세션 연장 실패.. 다시 로그인해주세요!");
                        setUsers(null);
                    });
                }
            }
        };

        const interval = setInterval(checkTokenRefresh, 60 * 1000); // 1분마다 체크
        return () => clearInterval(interval);
    }, []);

    // 이메일 인증 요청 - 서버
    const requestVerification = async () => {
        try {
            await axios.post("http://localhost:5000/request-verification", {
                email: signupForm.email
            });
            alert("인증 코드가 이메일로 전송되었습니다...");
        } catch (err){
            alert("이메일 전송 실패!");
        }
    };

    // 이메일 인증 코드 확인 - 서버
    const verifyCode = async () => {
        try {
            const res = await axios.post("http://localhost:5000/verify-code", {
                email: signupForm.email,
                code: signupForm.code
            });
            if(res.data.success) {
                alert("인증 완료!");
                setSignupForm({...signupForm, verified: true});
            }
        } catch (err){
            alert("인증 실패: 코드가 틀렸습니다!");
        }
    };

    // 회원탈퇴 - 서버
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("정말 회원탈퇴 하시겠습니까? 이전 상태로 되돌릴 수 없습니다!!");
        if(!confirmDelete) return;

        try {
            const res = await axios.post("http://localhost:5000/delete-account", {}, {
                withCredentials: true
            });
            alert(res.data.message);
            setUsers(null);
            setShowProfile(false);
            window.location.reload();
        } catch (err){
            alert("회원탈퇴에 실패했습니다..");
        }
    };

    
    // 사용자 우편함 열기 - 서버
    const handleOpenMailbox = async () => {
        try {
            const res = await axios.get("http://localhost:5000/mailbox", {
                withCredentials: true
            });
            setMailbox(res.data.mailbox);
            setShowMailbox(true);
            setIsModalOpen(true);
        } catch (err) {
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
                                <ul>
                                    {mailbox.map((mail, idx) => (
                                        <li key={idx}>
                                            <strong>{mail.title}</strong><br/>
                                            <span>{mail.content}</span><br/>
                                            <small>{new Date(mail.date).toLocaleString()}</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <>
                            {/* 계정 로그인 */}
                            <h1 className="master_logo">FearLess</h1>
                            <h2 className="signin_title">계정 로그인</h2>
                            <input 
                                name="email"
                                type="email"
                                placeholder="아이디/이메일" 
                                className="signin_input"
                                onChange={handleSigninChange}
                            />
                            <input 
                                name="password"
                                type="password" 
                                placeholder="비밀번호" 
                                className="signin_input"
                                onChange={handleSigninChange}
                            />
                            <button className="signin_btn" onClick={handleSigninSubmit}>로그인</button>
                            <button className="google_btn" onClick={()=>{
                                window.location.href = "http://localhost:5000/auth/google";
                            }}>
                                <FcGoogle size={24}/>
                            </button>
                            <hr className="divider"/>

                            {/* 계정 회원가입 */}
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
                                        <input 
                                            name="name"
                                            type="text"
                                            placeholder="이름" 
                                            className="signup_input"
                                            onChange={handleSignupChange}
                                        />
                                        <input 
                                            name="email"
                                            type="email"
                                            placeholder="아이디/이메일" 
                                            className="signup_input"
                                            onChange={handleSignupChange}
                                        />
                                        <input
                                            name="code"
                                            type="text"
                                            placeholder="인증 코드 입력"
                                            className="signup_input"
                                            onChange={(e)=>setSignupForm({...signupForm, code: e.target.value})}
                                        />
                                        <button className="verify_btn" onClick={requestVerification}>인증요청</button>
                                        <button className="verify_btn" onClick={verifyCode}>코드확인</button>
                                        <input 
                                            name="password"
                                            type="password" 
                                            placeholder="비밀번호" 
                                            className="signup_input"
                                            onChange={handleSignupChange}
                                        />
                                        <button className="signup_btn" onClick={handleSignupSubmit}>회원가입 완료</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </Modal>
            </nav>
            {/* 사용자 프로필 모달창 */}
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