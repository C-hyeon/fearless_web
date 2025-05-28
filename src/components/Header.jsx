import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import "../styles/Header.scss";

const Header = () => {
    return (
        <header className="main-header">
            <nav className="nav-menu">
                <span className="logo"><Link to="/">FearLess</Link></span>
                <span><Link to="">홈</Link></span>
                <span><Link to="/play">게임소개</Link></span>
                <span><Link to="/event">이벤트</Link></span>
                <span><Link to="/store">상점</Link></span>

                <span className="download">바로 다운로드</span>
                <span className="user-icon"><FaUserCircle /></span>
            </nav>
        </header>
    );
};

export default Header;