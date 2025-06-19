import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaUserCircle } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { motion, AnimatePresence } from "framer-motion";

import Modal from "./Modal";
import "../styles/Header.scss";

const Header = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [signupForm, setSignupForm] = useState({name: "", email: "", password: ""});
    const [signinForm, setSigninForm] = useState({email: "", password: ""});
    const [users, setUsers] = useState(null);
    const navigate = useNavigate();

    const handleOpen = () => setIsModalOpen(true);
    const handleClose = () => {
        setIsModalOpen(false);
        setShowSignup(false);
    };

    // 계정 회원가입 - 서버
    const handleSignupChange = (e) => setSignupForm({
        ...signupForm, [e.target.name]: e.target.value
    });

    const handleSignupSubmit = async () => {
        try{
            const res = await axios.post("http://localhost:5000/signup", signupForm);
            alert(res.data.message);
            setShowSignup(false);
        } catch(err){
            alert(err.response.data.message);
        }
    };

    // 계정 로그인 - 서버
    const handleSigninChange = (e) => setSigninForm({
        ...signinForm, [e.target.name]: e.target.value
    });

    const handleSigninSubmit = async () => {
        try{
            const res = await axios.post("http://localhost:5000/signin", signinForm);
            alert(res.data.message);
            setUsers(res.data.user);
            setIsModalOpen(false);
            navigate("/");
        } catch(err){
            alert(err.response.data.message);
        }
    };

    // 계정 로그인 상태 확인 - 서버
    const checkSigninStatus = async () => {
        const res = await axios.get("http://localhost:5000/status");
        if(res.data.loggedIn) setUsers(res.data.users);
    };

    // 계정 로그아웃 - 서버
    const handleSignout = async () => {
        await axios.post("http://localhost:5000/signout");
        setUsers(null);
    };

    useEffect(()=>{checkSigninStatus();}, []);

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
                    <><p onClick={handleSignout}>{users.name}</p></>
                ) : (
                    <><span className="user-icon" onClick={handleOpen}><FaUserCircle /></span></>
                )}
                
                <Modal isOpen={isModalOpen} onClose={handleClose}>
                    {/* 계정 로그인 */}
                    <h1 className="signin_logo">FearLess</h1>
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
                    <button className="google_btn"><FcGoogle size={24}/></button>
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
                </Modal>
            </nav>
        </header>
    );
};

export default Header;