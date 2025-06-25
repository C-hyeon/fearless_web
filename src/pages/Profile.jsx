import { motion } from "framer-motion";
import defaultProfile from "../images/User_defaultImg.png";
import "../styles/Modal.scss";
import "../styles/Header.scss";

const Profile = ({ user, onSignout, onClose, onDelete }) => {
    if (!user) return null;

    return (
        <div className="overlay">
            <motion.div
                className="modal" 
                    onClick={(e)=>e.stopPropagation()}
                    initial={{opacity: 0, y: -50}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: 50}}
                    transition={{duration: 0.4}}
            >
                <button className="closeButton" onClick={onClose}>
                    &times;
                </button>
                <h1 className="profile_logo">FearLess</h1>
                <h2 className="profile_title">프로필</h2>

                <div className="profile_content">
                    <img src={defaultProfile} alt="User Profile" className="user_img" />
                    <div className="profile_info">
                        <h2 className="name">{user.name}</h2>
                        <div className="status">
                            <div className="status_row">
                                <span>LEVEL</span>
                                <span>00</span>     {/* 게임 연동 필수 */}
                            </div>
                            <hr className="status_divider" />
                            <div className="status_row">
                                <span>STAGE</span>
                                <span>00</span>     {/* 게임 연동 필수 */}
                            </div>
                        </div>
                    </div>
                </div>

                <button className="profileupdate_btn">정보수정</button>
                <button className="signout_btn" onClick={onSignout}>로그아웃</button>
                <button className="deleteaccount_btn" onClick={onDelete}>회원탈퇴</button>
            </motion.div>
        </div>
    );
};

export default Profile;