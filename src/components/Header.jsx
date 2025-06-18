import { useState } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { motion, AnimatePresence } from "framer-motion";

import Modal from "./Modal";
import "../styles/Header.scss";

const Header = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    const handleOpen = () => setIsModalOpen(true);
    const handleClose = () => {
        setIsModalOpen(false);
        setShowSignup(false);
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
                <span className="user-icon" onClick={handleOpen}>
                    <FaUserCircle />
                </span>

                <Modal isOpen={isModalOpen} onClose={handleClose}>
                    {/* 계정 로그인 */}
                    <h1 className="signin_logo">FearLess</h1>
                    <h2 className="signin_title">계정 로그인</h2>
                    <input 
                        type="email" 
                        placeholder="아이디/이메일" 
                        className="signin_input"
                    />
                    <input 
                        type="password" 
                        placeholder="비밀번호" 
                        className="signin_input"
                    />
                    <button className="signin_btn">로그인</button>
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
                                    type="text" 
                                    placeholder="이름" 
                                    className="signup_input"
                                />
                                <input 
                                    type="email" 
                                    placeholder="아이디/이메일" 
                                    className="signup_input"
                                />
                                <input 
                                    type="password" 
                                    placeholder="비밀번호" 
                                    className="signup_input"
                                />
                                <button className="signup_btn">회원가입 완료</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Modal>
            </nav>
        </header>
    );
};

export default Header;