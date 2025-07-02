import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Event.scss";
import Wrapper from "../components/Wrapper";

const Event = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        axios.get("http://localhost:5000/items", {withCredentials: true})
            .then(res => setEvents(res.data.events))
            .catch(err => console.error("이벤트 로딩 실패: ", err));
    }, []);

    const handleClick = (index) => {
        alert(`${events[index].title} 클릭됨!`);
    };

    return (
        <Wrapper>
            {/* 게임 플레이타임 영역 */}
            <div className="event-header">
                <div className="event-description">
                    FearLess 게임 플레이타임 이벤트에 참여하고 다양한 보상을 받아보세요!
                </div>
                <div className="time-label">00:00:00</div>
            </div>
            {/* 이벤트 영역 */}
            <div className="event-container">
                {events.map((event, index) => (
                    <div className="event-wrapper" key={index}>
                        <div className="event-time">{event.time}</div>
                        <div className="event-box" onClick={() => handleClick(index)}>
                            <div className="image-wrapper">
                                <img src={event.image} alt={event.title} />
                            </div>
                            <div className="event-info">
                                <h3>{event.title}</h3>
                                <p>{event.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Wrapper>
    );
};

export default Event;