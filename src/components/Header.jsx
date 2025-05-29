import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import "../styles/Header.scss";

const Header = () => {
    return (
        <header className="main-header">
            <nav className="nav-menu">
                <Link to="/" className="logo">FearLess</Link>
                <Link to="">홈</Link>
                <Link to="/play">게임소개</Link>
                <Link to="/event">이벤트</Link>
                <Link to="/store">상점</Link>

                <span className="download">바로 다운로드</span>
                <span className="user-icon"><FaUserCircle /></span>
            </nav>
        </header>
    );
};

export default Header;