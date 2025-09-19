import { useState } from "react";

import "../styles/Play.scss";
import Wrapper from "../components/Wrapper";
import cardData from "../data/cards.json";

const Play = () => {
    const [currentStage, setCurrentStage] = useState(2);
    const [currentWeapon, setCurrentWeapon] = useState(2);

    const stageCards = cardData.stages;
    const weaponCards = cardData.weapons;

    const next = (list, currentSetter) => {
        currentSetter((prev) => (prev + 1) % list.length);
    };

    const prev = (list, currentSetter) => {
        currentSetter((prev) => (prev - 1 + list.length) % list.length);
    };

    return (
        <Wrapper>
            <div className="play_container">
                <div className="game_intro">
                    <div className="text_content">
                        <h2>FearLess</h2>
                        <br/>
                        <p>FearLess는 비밀 연구소에서 탄생한 전투 요원이 되어, 인류를 멸종시키려는 로봇과 외계 세력에 맞서는 3인칭 액션 게임이다.</p>
                        <p>지하철 아래의 로봇공장을 급습하고, 시간제한 탈출 미션을 수행한 뒤, 외계 포탈을 통해 침공하는 개조 생명체들과의 전면전에 돌입한다!</p>
                        <p>회전형 스테이지와 반복되는 웨이브 전투, 미사일을 이용한 포탈 파괴까지...</p>
                        <p>모든 전투를 끝내면, 무한 웨이브 생존 모드가 당신을 기다린다..!</p>
                        <p>지금, 두려움 없이 싸워라. FearLess!</p>
                    </div>
                    <div className="intro_image"/>
                </div>

                <div className="slider_wrapper">
                    <button className="arrow left" onClick={() => prev(stageCards, setCurrentStage)}>←</button>
                    <div className="carousel_track">
                        {stageCards.map((card, index) => {
                            const offset = index - currentStage;
                            const isActive = offset === 0;
                            return (
                                <div
                                    key={`stage-${index}`}
                                    className="card"
                                    style={{
                                        transform: `translateX(${offset * 120}%) scale(${isActive ? 1 : 0.85})`,
                                        opacity: isActive ? 1 : 0.5,
                                        zIndex: 10 - Math.abs(offset),
                                    }}
                                >
                                    <img src={card.image} alt={card.title} />
                                    <h3>{card.title}</h3>
                                    <p>{card.description}</p>
                                </div>
                            );
                        })}
                    </div>
                    <button className="arrow right" onClick={() => next(stageCards, setCurrentStage)}>→</button>
                </div>

                <div className="slider_wrapper">
                    <button className="arrow left" onClick={() => prev(weaponCards, setCurrentWeapon)}>←</button>
                    <div className="carousel_track">
                        {weaponCards.map((card, index) => {
                            const offset = index - currentWeapon;
                            const isActive = offset === 0;
                            return (
                                <div
                                    key={`weapon-${index}`}
                                    className="card"
                                    style={{
                                        transform: `translateX(${offset * 120}%) scale(${isActive ? 1 : 0.85})`,
                                        opacity: isActive ? 1 : 0.5,
                                        zIndex: 10 - Math.abs(offset),
                                    }}
                                >
                                    <img src={card.image} alt={card.title} />
                                    <h3>{card.title}</h3>
                                    <p>{card.description}</p>
                                </div>
                            );
                        })}
                    </div>
                    <button className="arrow right" onClick={() => next(weaponCards, setCurrentWeapon)}>→</button>
                </div>
            </div>
        </Wrapper>
    );
};

export default Play;