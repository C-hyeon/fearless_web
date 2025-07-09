import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "../styles/Store.scss";
import Wrapper from "../components/Wrapper";

import { GiTicket } from "react-icons/gi";
import { TbCoin } from "react-icons/tb";

const Store = () => {
    const [webItems, setWebItems] = useState([]);
    const [gameItems, setGameItems] = useState([]);
    const [ticketCount, setTicketCount] = useState(0);
    const [goldCount, setGoldCount] = useState(0);
    const hasFetched = useRef(false);

    const handlePurchase = async (item, type) => {
        try {
            const res = await axios.post("http://localhost:5000/purchase", {
                item,
                type
            }, { withCredentials: true });

            alert(res.data.message);
            window.location.reload(); // 티켓/골드 & 우편함 갱신
        } catch (err) {
            alert(err.response?.data?.message || "구매 실패");
        }
    };

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchStoreItems = async () => {
            try {
                // 1. 유저 상태 확인 및 ticket/coin 수치 가져오기
                const statusRes = await axios.get("http://localhost:5000/status", {
                    withCredentials: true
                });

                if (!statusRes.data.loggedIn) {
                    alert("로그인이 필요합니다.");
                    window.location.href = "/";
                    return;
                }

                const user = statusRes.data.user;

                // 티켓/골드 상태에 반영
                setTicketCount(user.ticket ?? 0);
                setGoldCount(user.coin ?? 0);

                // 상점 아이템 불러오기
                const res = await axios.get("http://localhost:5000/items", {
                    withCredentials: true
                });

                setWebItems(res.data.webItems || []);
                setGameItems(res.data.gameItems || []);

            } catch (err) {
                alert("로그인이 필요합니다.");
                window.location.href = "/";
            }
        };

        fetchStoreItems();
    }, []);

    return (
        <Wrapper>
            <div className="store-container">

                {/* 웹상점 */}
                <motion.div
                    className="store-section"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="store-title-wrapper">
                        <h2 className="store-title">웹상점</h2>
                        <div className="store-assets">
                            <GiTicket size={18} />
                            <span>{ticketCount}</span>
                            <TbCoin size={18} />
                            <span>{goldCount}</span>
                        </div>
                    </div>

                    <div className="store-grid">
                        {webItems.map((item) => (
                            <div 
                                className="store-item" 
                                key={item.id} 
                                onClick={() => {
                                    if (ticketCount >= item.cost) {
                                        handlePurchase(item, "web");
                                    } else {
                                        alert("티켓이 부족합니다.");
                                    }
                                }}
                            >
                                <img src={item.image} alt={item.title} />
                                <h4>{item.title} X {item.count}</h4>
                                <div className="cost-wrapper">
                                    <GiTicket size={16} />
                                    <span>{item.cost}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 게임상점 */}
                <motion.div
                    className="store-section"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h2 className="store-title">게임상점</h2>
                    <div className="store-grid">
                        {gameItems.map((item) => (
                            <div 
                                className="store-item" 
                                key={item.id} 
                                onClick={() => {
                                    if (goldCount >= item.cost) {
                                        handlePurchase(item, "game");
                                    } else {
                                        alert("골드가 부족합니다.");
                                    }
                                }}
                            >
                                <img src={item.image} alt={item.title} />
                                <h4>{item.title} X {item.count}</h4>
                                <div className="cost-wrapper">
                                    <TbCoin size={16} />
                                    <span>{item.cost}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </Wrapper>
    );
};

export default Store;
