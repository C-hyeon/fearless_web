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
                                <img
                                    src={card.image || ""}
                                    alt={card.title}
                                />
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                        );
                    })}
                </div>
                <button className="arrow right" onClick={nextCard}>→</button>
            </div>
        </Wrapper>
    );
};

export default Play;