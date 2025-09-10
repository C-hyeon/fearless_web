import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "../styles/Store.scss";
import Wrapper from "../components/Wrapper";

import { GiTicket } from "react-icons/gi";
import { TbCoin } from "react-icons/tb";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const Store = () => {
    const [webItems, setWebItems] = useState([]);
    const [gameItems, setGameItems] = useState([]);
    const [ticketCount, setTicketCount] = useState(0);
    const [goldCount, setGoldCount] = useState(0);
    const hasFetched = useRef(false);

    const handlePurchase = async (item, type) => {
        try {
            const res = await api.post("/purchase", { item, type });
            alert(res.data.message);

            const statusRes = await api.get("/status");
            const user = statusRes.data.user;
            setTicketCount(user.ticket ?? 0);
            setGoldCount(user.items?.currency_credit ?? 0);
        } catch (err) {
            alert(err.response?.data?.message || "구매 실패");
        }
    };

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchStoreData = async () => {
            try {
                const statusRes = await api.get("/status");
                if (!statusRes.data.loggedIn) {
                    alert("로그인이 필요합니다.");
                    window.location.href = "/";
                    return;
                }

                const user = statusRes.data.user;
                setTicketCount(user.ticket ?? 0);
                setGoldCount(user.items?.currency_credit ?? 0);

                const res = await api.get("/items");
                setWebItems(res.data.webItems || []);
                setGameItems(res.data.gameItems || []);
            } catch (err) {
                alert("로그인이 필요합니다.");
                window.location.href = "/";
            }
        };
        fetchStoreData();
    }, []);

    return (
        <Wrapper>
            <div className="store-container">
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
                        {webItems.map((item, idx) => (
                            <div
                                className="store-item"
                                key={item.id || `web-${idx}`}
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

                <motion.div
                    className="store-section"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h2 className="store-title">게임상점</h2>
                    <div className="store-grid">
                        {gameItems.map((item, idx) => (
                            <div
                                className="store-item"
                                key={item.id || `game-${idx}`}
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
