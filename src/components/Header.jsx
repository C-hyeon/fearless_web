import { FaUserCircle } from "react-icons/fa";
import "../styles/Header.scss";

const Header = () => {
    return (
        <header className="main-header">
            <nav className="nav-menu">
                <span className="logo">FearLess</span>
                <span>홈</span>
                <span>게임 소개</span>
                <span>다운로드</span>
                <span>이벤트</span>
                <span>상점</span>
                <span className="user-icon"><FaUserCircle /></span>
            </nav>
        </header>
    );
};

export default Header;