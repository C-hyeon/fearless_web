import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import "../styles/Event.scss";
import Wrapper from "../components/Wrapper";
import { usePlaytime } from "../utils/PlaytimeContext";
import { formatSeconds, parseTimeString } from "../utils/formatTime";


const Event = () => {
    const [events, setEvents] = useState([]);
    const [unlockTimes, setUnlockTimes] = useState([]);
    const { currentPlaytime } = usePlaytime();
    const hasFetched = useRef(false); // 이 변수로 중복 방지
    const [claimedTitles, setClaimedTitles] = useState([]);
    const [isClaiming, setIsClaiming] = useState(false);

    // 1. 데이터 로딩 상태관리 훅
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

                const mailboxRes = await axios.get("http://localhost:5000/mailbox", {
                    withCredentials: true
                });
                const mailboxTitles = mailboxRes.data.mailbox.map(mail => mail.title);
                setClaimedTitles(mailboxTitles);

            } catch (err) {
                alert("로그인이 필요합니다.");
                window.location.href = "/";
            }
        };
        fetchProtectedData();
    }, []);

    // 2. 이벤트 페이지를 다시 활성화할 때 토큰 갱신 검사 상태관리 훅
    useEffect(() => {
        const onVisible = () => {
            // 탭 재활성화 시 갱신 로직 진행
            const token = Cookies.get("token");
            if(!token) return;

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const exp = payload.exp * 1000;
                const now = Date.now();
                const timeLeft = exp - now;

                if(timeLeft < 5 * 60 * 1000) {
                    axios.post("http://localhost:5000/refresh-token", {}, {withCredentials: true})
                    .then(() => console.log("세션 갱신됨.."))
                    .catch(() => {
                        alert("세션 연장 실패.. 다시 로그인해주세요!");
                        window.location.href = "/";
                    });
                }
            } catch (e) {
                console.error("토큰 디코딩 실패:", e);
            }
        };

        const handleVisibilityChange = () => {
            if(document.visibilityState === "visible") {
                onVisible();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    const handleClick = async (index) => {
        if(isClaiming) return;
        setIsClaiming(true);

        const event = events[index];
        if (currentPlaytime < unlockTimes[index]) return;
        if (claimedTitles.includes(event.title)) {
            alert("이미 수령한 아이템입니다!");
            setIsClaiming(false);
            return;
        }

        try {
            const res = await axios.post("http://localhost:5000/mailbox", {
                title: event.title,
                content: event.description
            }, { withCredentials: true });

            alert(res.data.message);
            setClaimedTitles(prev => [...prev, event.title]);
        } catch (err) {
            alert("보상 수령 실패: " + (err.response?.data?.message || "오류"));
        } finally {
            setIsClaiming(false);
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
                                {claimed && (
                                    <div className="claimed-overlay">수령 완료</div>
                                )}

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