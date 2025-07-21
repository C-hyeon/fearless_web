import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import Wrapper from '../components/Wrapper';
import "../styles/Main.scss";

const stageImages = [
    "https://firebasestorage.googleapis.com/v0/b/fearless-3e591.firebasestorage.app/o/stages%2FStage0_TrainingRoom.png?alt=media&token=4f42eb9b-b58d-40be-987a-b5bd56159a0a",
    "https://firebasestorage.googleapis.com/v0/b/fearless-3e591.firebasestorage.app/o/stages%2FStage1_RobotFactory.png?alt=media&token=b3af8817-61b3-4590-8415-d0b73532bae1",
    "https://firebasestorage.googleapis.com/v0/b/fearless-3e591.firebasestorage.app/o/stages%2FStage2_IncubatorRoom.jpg?alt=media&token=05e0f8ff-800f-41eb-8be8-fc2341d289d3",
    "https://firebasestorage.googleapis.com/v0/b/fearless-3e591.firebasestorage.app/o/stages%2FStage3_GeneratorRoom.jpg?alt=media&token=7ef768c3-9c69-4090-b1a6-cf7c24170879",
    "https://firebasestorage.googleapis.com/v0/b/fearless-3e591.firebasestorage.app/o/stages%2FStage4_RuinedCity.png?alt=media&token=9a4bade5-3089-40df-8722-f3d5fadf6ac8"
];

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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % stageImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const direction = ['play', 'event', 'store'].indexOf(menu) > ['play', 'event', 'store'].indexOf(prevMenu) ? 1 : -1;

    const renderMenu = () => {
        let Component = null;
        if (menu === 'play') Component = <Play_Menu/>;
        if (menu === 'event') Component = <Event_Menu/>;
        if (menu === 'store') Component = <Store_Menu/>;
        return Component;
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
                        <AnimatePresence mode="wait">
                            {stageImages.map((url, index) =>
                                index === currentImageIndex && (
                                    <motion.div
                                        key={url}
                                        className="right-panel"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 1 }}
                                        style={{ backgroundImage: `url(${url})` }}
                                    />
                                )
                            )}
                        </AnimatePresence>

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
                <AnimatePresence mode="wait">
                    <motion.div
                        key={menu}
                        initial={{ x: 100 * direction, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100 * direction, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderMenu()}
                    </motion.div>
                </AnimatePresence>
                <br/><br/><br/>
            </div>
        </Wrapper>
    );
};

export default Main;