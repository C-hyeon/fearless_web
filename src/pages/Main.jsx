import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

import Wrapper from '../components/Wrapper';
import "../styles/Main.scss";

const Play_Menu = () => {
    return (
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
    );
};

const Event_Menu = () => {
    return (
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
    );
};

const Store_Menu = () => {
    return (
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
    );
};

const Main = () => {
    const [menu, setMenu] = useState('play');
    const [prevMenu, setPrevMenu] = useState('play');

    const menuOrder = ['play', 'event', 'store'];
    const direction = menuOrder.indexOf(menu) > menuOrder.indexOf(prevMenu) ? 1 : -1;

    const renderMenu = () => {
        let Component = null;
        if (menu === 'play') Component = <Play_Menu/>;
        if (menu === 'event') Component = <Event_Menu/>;
        if (menu === 'store') Component = <Store_Menu/>;

        return (
            <motion.div
                key={menu}
                initial={{ x: 100 * direction, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100 * direction, opacity: 0 }}
                transition={{ duration: 0.6 }}
            >
                {Component}
            </motion.div>
        );
    };

    const handleClick = (newMenu) => {
        if(newMenu !== menu) {
            setPrevMenu(menu);
            setMenu(newMenu);
        }
    };

    return (
        <Wrapper>
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
                <div className="main-menuBox">
                    <button className="more-button" onClick={()=>handleClick('play')}>게임소개</button>
                    <button className="more-button" onClick={()=>handleClick('event')}>이벤트</button>
                    <button className="more-button" onClick={()=>handleClick('store')}>상점</button>
                </div>
                <br/>
                <>{renderMenu()}</>
                <br/><br/><br/>
            </div>
        </Wrapper>
    );
};

export default Main;