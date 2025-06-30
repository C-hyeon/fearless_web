import { useState } from "react";

import "../styles/Play.scss";
import Wrapper from "../components/Wrapper";

const cards = [
    {title: "스테이지 1", description: "스테이지 1에 대한 설명입니다.", image: ""},
    {title: "스테이지 2", description: "스테이지 2에 대한 설명입니다.", image: ""},
    {title: "스테이지 3", description: "스테이지 3에 대한 설명입니다.", image: ""},
    {title: "스테이지 4", description: "스테이지 4에 대한 설명입니다.", image: ""},
    {title: "스테이지 5", description: "스테이지 5에 대한 설명입니다.", image: ""},
];

const Play = () => {
    const [current, setCurrent] = useState(2);

    const prevCard = () => {
        setCurrent((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
    };

    const nextCard = () => {
        setCurrent((prev) => (prev === cards.length - 1 ? 0 : prev + 1));
    };

    return (
        <Wrapper>
            <div className="play_container">
                <div className="game_intro">
                    <div className="text_content">
                        <h2>FearLess</h2>
                        <p>FearLess는 비밀 연구소에서 탄생한 전투 요원이 되어, 인류를 멸종시키려는 로봇과 외계 세력에 맞서는 3인칭 액션 게임이다.</p>
                        <p>지하철 아래의 로봇공장을 급습하고, 시간제한 탈출 미션을 수행한 뒤, 외계 포탈을 통해 침공하는 개조 생명체들과의 전면전에 돌입한다!</p>
                        <p>회전형 스테이지와 반복되는 웨이브 전투, 미사일을 이용한 포탈 파괴까지...</p>
                        <p>모든 전투를 끝내면, 무한 웨이브 생존 모드가 당신을 기다린다..!</p>
                        <p>지금, 두려움 없이 싸워라. FearLess!</p>
                    </div>
                    <div className="intro_image"/>
                </div>

                <div className="slider_wrapper">
                    <button className="arrow left" onClick={prevCard}>←</button>
                    <div className="carousel_track">
                        {cards.map((card, index) => {
                            const offset = index - current;
                            const translateX = offset * 120;
                            const scale = offset === 0 ? 1 : 0.85;
                            const opacity = offset === 0 ? 1 : 0.5;

                            return (
                                <div
                                    key={index}
                                    className="card"
                                    style={{
                                        transform: `translateX(${translateX}%) scale(${scale})`,
                                        opacity,
                                        zIndex: 10 - Math.abs(offset),
                                    }}
                                >
                                    <img src={card.image} alt={card.title}/>
                                    <h3>{card.title}</h3>
                                    <p>{card.description}</p>
                                </div>
                            );
                        })}
                    </div>
                    <button className="arrow right" onClick={nextCard}>→</button>
                </div>
            </div>
        </Wrapper>
    );
};

export default Play;