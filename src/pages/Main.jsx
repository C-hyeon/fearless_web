import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';

import "../styles/Main.scss";

const Main = () => {
    return (
        <div className="main-container">
            <div className="main-content">
                <div className="image-box">
                    <div className="left-panel">
                        <h1>Fear Less</h1>
                    </div>
                    <div className="right-panel" />
                    <svg className="diagonal-line" viewBox="0 0 100 100" preserveAspectRatio="none" />
                </div>
            </div>
            <br/><br/><br/>

            <div className="main-section">
                <div className="main-panel">
                    <h2>게임소개</h2>
                    <span className="sub">How to play</span>
                    <div className="number">01</div>
                </div>
                <div className="main-background">
                    <div className="main-overlay">
                        <h3>예시 소개 글 입니다.</h3>
                        <Link to='/play' className="more-button">
                            <span>더보기</span>
                            <FaChevronRight className="icon" />
                        </Link>
                    </div>
                </div>
            </div>
            <br/><br/><br/>

            <div className="main-section">
                <div className="main-panel">
                    <h2>이벤트</h2>
                    <span className="sub">Event</span>
                    <div className="number">02</div>
                </div>
                <div className="main-background">
                    <div className="main-overlay">
                        <h3>예시 이벤트 글 입니다.</h3>
                        <Link to='/event' className="more-button">
                            <span>더보기</span>
                            <FaChevronRight className="icon" />
                        </Link>
                    </div>
                </div>
            </div>
            <br/><br/><br/>

            <div className="main-section">
                <div className="main-panel">
                    <h2>상점</h2>
                    <span className="sub">Store</span>
                    <div className="number">03</div>
                </div>
                <div className="main-background">
                    <div className="main-overlay">
                        <h3>예시 상점 글 입니다.</h3>
                        <Link to='/store' className="more-button">
                            <span>더보기</span>
                            <FaChevronRight className="icon" />
                        </Link>
                    </div>
                </div>
            </div>
            <br/><br/><br/>
            
        </div>
    );
};

export default Main;