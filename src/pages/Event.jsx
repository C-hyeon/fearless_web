import { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../styles/Event.scss";
import Wrapper from "../components/Wrapper";
import { usePlaytime } from "../utils/PlaytimeContext";
import { formatSeconds, parseTimeString } from "../utils/formatTime";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const Event = () => {
    const [events, setEvents] = useState([]);
    const [unlockTimes, setUnlockTimes] = useState([]);
    const { currentPlaytime } = usePlaytime();
    const hasFetched = useRef(false);
    const hasRefreshedRef = useRef(false);
    const [claimedTitles, setClaimedTitles] = useState([]);
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchProtectedData = async () => {
            try {
                const statusRes = await api.get("/status");
                if (!statusRes.data.loggedIn) {
                    alert("로그인이 필요합니다.");
                    window.location.href = "/";
                    return;
                }

                const itemsRes = await api.get("/items");
                setEvents(itemsRes.data.events || []);

                const times = (itemsRes.data.events || []).map(ev => parseTimeString(ev.time));
                setUnlockTimes(times);

                const mailboxRes = await api.get("/mailbox-all");
                const mailboxTitles = mailboxRes.data.mailbox.map(mail => mail.title);
                setClaimedTitles(mailboxTitles);

            } catch (err) {
                alert("로그인이 필요합니다.");
                window.location.href = "/";
            }
        };

        fetchProtectedData();
    }, []);

    useEffect(() => {
        const onVisible = async () => {
            if (hasRefreshedRef.current) return;
            try {
                await api.post("/refresh-token");
                console.log("탭 복귀로 인해 세션 자동 연장됨");
                hasRefreshedRef.current = true;
            } catch (err) {
                console.error("세션 자동 연장 실패:", err);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") onVisible();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    const handleClick = async (index) => {
        if (isClaiming) return;
        setIsClaiming(true);

        const event = events[index];
        if (currentPlaytime < unlockTimes[index]) {
            setIsClaiming(false);
            return;
        }
        if (claimedTitles.includes(event.title)) {
            alert("이미 수령한 아이템입니다!");
            setIsClaiming(false);
            return;
        }

        try {
            const res = await api.post("/mailbox", {
                title: event.title,
                content: event.description,
                count: event.count || 1,
                type: event.type,
                image: event.image,
                description: event.description,
                time: event.time
            });

            alert(res.data.message);
            window.location.reload();
        } catch (err) {
            alert("보상 수령 실패: " + (err.response?.data?.message || "오류"));
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <Wrapper>
            <div className="event-header">
                <div className="event-description">
                    FearLess 게임 플레이타임 이벤트에 참여하고 다양한 보상을 받아보세요!
                </div>
                <div className="time-label">{formatSeconds(currentPlaytime)}</div>
            </div>
            <div className="event-container">
                {events.map((event, index) => {
                    const unlocked = currentPlaytime >= unlockTimes[index];
                    const claimed = claimedTitles.includes(event.title);

                    return (
                        <div className={`event-wrapper ${unlocked ? "" : "locked"}`} key={index}>
                            <div className="event-time">{event.time}</div>
                            <div
                                className="event-box"
                                onClick={() => unlocked && !claimed && handleClick(index)}
                                style={{
                                    filter: unlocked && !claimed ? "none" : "grayscale(100%)",
                                    pointerEvents: unlocked && !claimed ? "auto" : "none",
                                    opacity: claimed ? 0.5 : 1,
                                    position: "relative",
                                    transition: "all 0.3s"
                                }}
                            >
                                {claimed && (<div className="claimed-overlay">수령 완료</div>)}
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
