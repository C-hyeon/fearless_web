import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaUserCircle } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { CiMail } from "react-icons/ci";
import { motion, AnimatePresence } from "framer-motion";

import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import Modal from "./Modal";
import Profile from "../pages/Profile";
import "../styles/Header.scss";
import { usePlaytime } from "../utils/PlaytimeContext";

const Header = () => {
    const { currentPlaytime, stopTimer } = usePlaytime();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [validationState, setValidationState] = useState({
        nameChecked: false,
        emailChecked: false,
        passwordChecked: false
    });
    const [passwordStrength, setPasswordStrength] = useState("");   // weak - medium - strong
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

    const handleSignupChange = (e) => {
        const { name, value } = e.target;

        setSignupForm(prev => ({ ...prev, [name]: value }));

        if (name === "password") {
            evaluatePasswordStrength(value);
            setValidationState(prev => ({ ...prev, passwordChecked: false }));
        }
        if (name === "name") setValidationState(prev => ({ ...prev, nameChecked: false }));
        if (name === "email") setValidationState(prev => ({ ...prev, emailChecked: false }));
    };


    const handleSigninChange = (e) => setSigninForm({ ...signinForm, [e.target.name]: e.target.value });

    // 로컬 회원가입 시 이름/닉네임 중복확인
    const checkDuplicationName = async () => {
        if(!signupForm.name.trim()) return alert("이름을 입력해주세요.");
        try {
            const res = await axios.get(`http://localhost:5000/check-name?name=${signupForm.name}`);
            if(res.data.available) {
                alert("사용할 수 있는 이름입니다!!");
                setValidationState(prev => ({ ...prev, nameChecked: true }));
            } else {
                alert("이미 사용 중인 이름입니다!");
                setValidationState(prev => ({ ...prev, nameChecked: false }));
            }
        } catch(err) {
            alert("확인 중 오류 발생!");
        }
    };

    // 로컬 회원가입 시 이메일 중복확인
    const checkDuplicateEmail = async () => {
        if (!signupForm.email.trim()) return alert("이메일을 입력해주세요.");
        try {
            const res = await axios.get(`http://localhost:5000/check-email?email=${signupForm.email}`);
            if (res.data.available) {
                alert("사용할 수 있는 이메일입니다!");
                setValidationState(prev => ({ ...prev, emailChecked: true }));
            } else {
                alert("이미 사용 중인 이메일입니다!");
                setValidationState(prev => ({ ...prev, emailChecked: false }));
            }
        } catch (err) {
            alert("확인 중 오류 발생!");
        }
    };

    // 로컬 회원가입 시 비밀번호 입력에 따른 실시간 계산
    const evaluatePasswordStrength = (password) => {
        let score = 0;
        if(password.length >= 8) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

        if (score === 0) setPasswordStrength("none");
        else if (score <= 2) setPasswordStrength("weak");
        else if (score === 3 || score === 4) setPasswordStrength("medium");
        else if (score === 5) setPasswordStrength("strong");
    };

    // 로컬 회원가입 시 비밀번호 보안등급 검증(대소문자 + 숫자 + 특수문자)
    const checkPasswordStrength = () => {
        const password = signupForm.password;
        
        if(password.length < 8) return alert("비밀번호는 최소 8자 이상이어야 합니다!");
        else if(password.length > 20) return alert("비밀번호는 최대 20자까지 가능합니다!");

        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpper) return alert("비밀번호에 대문자가 포함되어야 합니다!");
        if (!hasLower) return alert("비밀번호에 소문자가 포함되어야 합니다!");
        if (!hasNumber) return alert("비밀번호에 숫자가 포함되어야 합니다!");
        if (!hasSpecial) return alert("비밀번호에 특수문자가 포함되어야 합니다!");

        alert("사용 가능한 비밀번호입니다!");
        setValidationState(prev => ({ ...prev, passwordChecked: true }));
    };

    // 로컬 회원가입 및 로그인
    const handleSignupSubmit = async () => {
        const { nameChecked, emailChecked, passwordChecked } = validationState;

        if (!signupForm.verified) {
            alert("이메일 인증을 완료해주세요!");
            return;
        }
        if (!nameChecked) {
            alert("이름 중복 확인을 완료해주세요!");
            return;
        }
        if (!emailChecked) {
            alert("이메일 중복 확인을 완료해주세요!");
            return;
        }
        if (!passwordChecked) {
            alert("비밀번호 강도 검사를 완료해주세요!");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                signupForm.email,
                signupForm.password
            );

            await axios.post(
                "http://localhost:5000/sessionLogin", {
                uid: userCredential.user.uid,
                email: signupForm.email,
                name: signupForm.name
            }, { withCredentials: true });

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

    // 로컬 로그인
    const handleSigninSubmit = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                signinForm.email,
                signinForm.password
            );

            const res = await axios.post("http://localhost:5000/sessionLogin", {
                uid: userCredential.user.uid,
                email: signinForm.email,
            }, { withCredentials: true });

            await axios.post("http://localhost:5000/update-last-activity", {
                playtimeInSeconds: currentPlaytime
            }, { withCredentials: true });

            alert("로그인 완료!");
            setUsers({ email: signinForm.email });
            setIsModalOpen(false);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("로그인 실패: " + err.message);
        }
    };

    // 구글 로그인
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

            await axios.post("http://localhost:5000/update-last-activity", {
                playtimeInSeconds: currentPlaytime
            }, { withCredentials: true });

            alert("Google 로그인 완료");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Google 로그인 실패");
        }
    };

    // 로그인 상태확인
    const checkSigninStatus = async () => {
        try {
            const res = await axios.get("http://localhost:5000/status", {withCredentials: true});
            if (res.data.loggedIn) setUsers(res.data.user);
        } catch {
            setUsers(null);
        }
    };

    // 로그아웃
    const handleSignout = async () => {
        const confirmSignout = window.confirm("정말 로그아웃 하시겠습니까?");
        if (!confirmSignout) return;

        try {
            stopTimer();

            await axios.post(
                "http://localhost:5000/save-playtime", { playtimeInSeconds: currentPlaytime }, { withCredentials: true }
            );
            const res = await axios.post(
                "http://localhost:5000/signout", {}, { withCredentials: true }
            );
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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

    // 이메일 인증코드 요청
    const requestVerification = async () => {
        try {
            await axios.post("http://localhost:5000/request-verification", {email: signupForm.email});
            alert("인증 코드가 이메일로 전송되었습니다...");
        } catch {
            alert("이메일 전송 실패!");
        }
    };

    // 이메일 인증코드 확인
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

    // 회원탈퇴
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
        "정말 회원탈퇴 하시겠습니까? 이전 상태로 되돌릴 수 없습니다!!"
        );
        if (!confirmDelete) return;

        try {
            const res = await axios.post(
                "http://localhost:5000/delete-account",
                {}, { withCredentials: true }
            );
            alert(res.data.message);
            setUsers(null);
            setShowProfile(false);
            window.location.reload();
        } catch {
            alert("회원탈퇴에 실패했습니다..");
        }
    };

    // 우편함 열기
    const handleOpenMailbox = async () => {
        try {
            const res = await axios.get("http://localhost:5000/mailbox", {withCredentials: true});
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
                            <input name="email" type="email" placeholder="아이디 / 이메일" className="signin_input" onChange={handleSigninChange}/>
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
                                        <div className="signup_input-group">
                                            <input name="name" type="text" placeholder="이름 / 별명" className="signup_input" onChange={handleSignupChange} />
                                            <button className="check_btn" onClick={checkDuplicationName}>✔</button>
                                        </div>
                                        <div className="signup_input-group">
                                            <input name="email" type="email" placeholder="아이디 / 이메일" className="signup_input" onChange={handleSignupChange}/>
                                            <button className="check_btn" onClick={checkDuplicateEmail}>✔</button>
                                        </div>
                                        <div className="signup_input-group">
                                            <input name="password" type="password" placeholder="비밀번호(대소문자+숫자+특수문자 포함 8자 이상)" className="signup_input" onChange={handleSignupChange}/>
                                            <div className="password-strength-bar">
                                                <div className={`strength-indicator ${passwordStrength}`}>
                                                    {passwordStrength === "none" && "없음"}
                                                    {passwordStrength === "weak" && "약함"}
                                                    {passwordStrength === "medium" && "보통"}
                                                    {passwordStrength === "strong" && "강함"}
                                                </div>
                                            </div>
                                            <button className="check_btn" onClick={checkPasswordStrength}>✔</button>
                                        </div>
                                        <div className="signup_input-group">
                                            <input name="code" type="text" placeholder="인증 코드 입력" className="signup_input" onChange={(e)=>setSignupForm({...signupForm, code: e.target.value})}/>
                                            <button className="verify_btn" onClick={requestVerification}>인증요청</button>
                                            <button className="verify_btn" onClick={verifyCode}>코드확인</button>
                                        </div>
                                        
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
