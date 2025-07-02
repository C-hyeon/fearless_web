import { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../styles/Event.scss";
import Wrapper from "../components/Wrapper";
import { usePlaytime } from "../utils/PlaytimeContext";
import { formatSeconds, parseTimeString } from "../utils/formatTime";

const Event = () => {
    const [events, setEvents] = useState([]);
    const [unlockTimes, setUnlockTimes] = useState([]);
    const { currentPlaytime } = usePlaytime();
    const hasFetched = useRef(false); // 이 변수로 중복 방지

    useEffect(() => {
        if (hasFetched.current) return; // 이미 실행됐으면 무시
        hasFetched.current = true;

        const fetchProtectedData = async () => {
            try {
                const statusRes = await axios.get("http://localhost:5000/status", {
                    withCredentials: true
                });

                if (!statusRes.data.loggedIn) {
                    alert("로그인이 필요합니다.");
                    window.location.href = "/";
                    return;
                }

                const itemsRes = await axios.get("http://localhost:5000/items", {
                    withCredentials: true
                });
                setEvents(itemsRes.data.events || []);

                const times = (itemsRes.data.events || []).map(ev => 
                    parseTimeString(ev.time)
                );
                setUnlockTimes(times);

            } catch (err) {
                alert("로그인이 필요합니다.");
                window.location.href = "/";
            }
        };
        fetchProtectedData();
    }, []);

    const handleClick = (index) => {
        if(currentPlaytime >= unlockTimes[index]) {
            alert(`${events[index].title} 클릭됨!`);
        }
    };

    return (
        <Wrapper>
            {/* 게임 플레이타임 영역 */}
            <div className="event-header">
                <div className="event-description">
                    FearLess 게임 플레이타임 이벤트에 참여하고 다양한 보상을 받아보세요!
                </div>
                <div className="time-label">{formatSeconds(currentPlaytime)}</div>
            </div>
            {/* 이벤트 영역 */}
            <div className="event-container">
                {events.map((event, index) => {
                    const unlocked = currentPlaytime >= unlockTimes[index];
                    return (
                        <div className={`event-wrapper ${unlocked ? "" : "locked"}`} key={index}>
                            <div className="event-time">{event.time}</div>
                            <div 
                                className="event-box" 
                                onClick={() => unlocked && handleClick(index)}
                                style={{
                                    filter: unlocked ? "none" : "blur(3px)",
                                    pointerEvents: unlocked ? "auto" : "none",
                                    opacity: unlocked ? 1 : 0.5,
                                    transition: "all 0.3s"
                                }}
                            >
                                <div className="image-wrapper">
                                    <img src={event.image} alt={event.title} />
                                </div>
                                <div className="event-info">
                                    <h3>{event.title}</h3>
                                    <p>{event.description}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Wrapper>
    );
};

export default Event;