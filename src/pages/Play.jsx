import { useState } from "react";
import "../styles/Main.scss";
import Wrapper from '../components/Wrapper';

const cardData = [
    {
        id: 1,
        title: '소개[1]',
        subtitle: '소개 첫번째',
        description: '예시 설명 1 입니다.',
    },
    {
        id: 2,
        title: '소개[2]',
        subtitle: '소개 두번째',
        description: '예시 설명 2 입니다.',
    },
    {
        id: 3,
        title: '소개[3]',
        subtitle: '소개 세번째',
        description: '예시 설명 3 입니다.',
    }
];

const Play = () => {
    const [current, setCurrent] = useState(0);
    const next = () => setCurrent((current + 1) % cardData.length);
    const prev = () => setCurrent((current - 1 + cardData.length) % cardData.length);

    return (
        <Wrapper>
            <div className="background-page">
                <div className="left-label">
                    <p className="label-title">게임 소개</p>
                    <p className="label-sub">How to play</p>
                    <p className="label-number">02</p>
                </div>

                <button className="arrow-button" onClick={prev} />

                <div className="card-slider">
                    {cardData.map((card, index) => (
                        <div
                            key={card.id}
                            className={`card ${index === current ? 'active' : 'inactive'}`}>
                            <div className="diagonal-mask">
                                <img src={card.image} alt={card.title} />
                            </div>
                            <div className="card-content">
                                <h2>{card.title}</h2>
                                <h3>{card.subtitle}</h3>
                                <p>{card.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="arrow-button right" onClick={next} />
            </div>
        </Wrapper>
    );
};

export default Play;