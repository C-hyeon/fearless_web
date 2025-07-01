import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "../styles/Modal.scss";
import "../styles/Header.scss";

const Profile = ({ user, onSignout, onClose, onDelete }) => {
    const [showUpdateProfile, setShowUpdateProfile] = useState(false);
    const [updateProfile, setUpdateProfile] =useState({
        name: user.name,
        password: ""
    });
    const [previewImage, setPreviewImage] = useState(user.profileImage);

    const handleChange = (e) => {
        setUpdateProfile({...updateProfile, [e.target.name]: e.target.value});
    };

    const handleUpdate = async () => {
        const formData = new FormData();
        formData.append("name", updateProfile.name);
        formData.append("password", updateProfile.password);
        
        if(updateProfile.profileImage === null) {
            // 기본 이미지로 변경 요청
            formData.append("resetToDefault", "true");
        } else if(updateProfile.profileImage instanceof File) {
            // 새 이미지 업로드 요청
            formData.append("profileImage", updateProfile.profileImage);
        }

        try {
            const res = await fetch("http://localhost:5000/update-profile", {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            const data = await res.json();
            alert(data.message);
            setShowUpdateProfile(false);
            window.location.reload();
        } catch (err){
            alert("회원정보 수정을 실패했습니다..");
        }
    };

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
                <h1 className="master_logo">FearLess</h1>
                <h2 className="profile_title">프로필</h2>

                <div className="profile_content">
                    <div 
                        className="user_img" 
                        style={{
                            backgroundImage: previewImage.startsWith("blob:")
                            ? `url(${previewImage})`
                            : `url(http://localhost:5000${previewImage})`
                        }} 
                    />
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

                <button className="profileupdate_btn" onClick={()=>setShowUpdateProfile(prev => !prev)}>정보수정</button>
                <button className="signout_btn" onClick={onSignout}>로그아웃</button>
                <button className="deleteaccount_btn" onClick={onDelete}>회원탈퇴</button>
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
                                    if(file) {
                                        setUpdateProfile({ ...updateProfile, profileImage: file });
                                        setPreviewImage(URL.createObjectURL(file));
                                    }
                                }}
                                className="update_input"
                            />
                            <button className="resetimg_btn" onClick={()=>{
                                setUpdateProfile({
                                    ...updateProfile,
                                    profileImage: null // 기본 이미지 요청
                                });
                                setPreviewImage("/images/User_defaultImg.png");
                                alert("기본 이미지로 변경되었습니다!!");
                            }}>기본이미지 변경</button>
                            <input
                                name="name"
                                type="text"
                                placeholder="이름"
                                value={updateProfile.name}
                                onChange={handleChange}
                                className="update_input"
                            />
                            <input
                                type="email"
                                value={user.email}
                                readOnly
                                className="update_input blurred"
                            />
                            <input
                                type="text"
                                value={user.provider}
                                readOnly
                                className="update_input blurred"
                            />
                            {user.provider === "Local" && (
                                <input
                                    name="password"
                                    type="password"
                                    placeholder="새 비밀번호"
                                    value={updateProfile.password}
                                    onChange={handleChange}
                                    className="update_input"
                                />
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