import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const PlaytimeContext = createContext();

export const PlaytimeProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const stopTimer = () => {
    console.log("웹 클라이언트 타이머 사용 안함");
  };

  const checkAndRefreshToken = async () => {
    try {
      await api.post("/refresh-token");
      console.log("세션 자동 갱신됨");
    } catch (err) {
      console.error("토큰 갱신 실패:", err);
    }
  };

  const readServerPlaytime = async () => {
    try {
      const res = await api.get("/status");
      if (!res.data.loggedIn) {
        setIsLoggedIn(false);
        setCurrentPlaytime(0);
        return;
      }
      setIsLoggedIn(true);
      const seconds = typeof res.data.user.playtime === "number" ? res.data.user.playtime : 0;
      setCurrentPlaytime(seconds);
    } catch (err) {
      console.error("Playtime 조회 실패", err);
      setIsLoggedIn(false);
      setCurrentPlaytime(0);
    }
  };

  useEffect(() => {
    const init = async () => {
      await readServerPlaytime();
      setLoading(false);
    };
    if (!initializedRef.current) {
      initializedRef.current = true;
      init();
    }
    return () => {
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await readServerPlaytime();
        await checkAndRefreshToken();
        console.log("탭 복귀 → 서버 플레이타임 재반영");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (loading || !isLoggedIn) return;
    const interval = setInterval(() => {
      api.post("/update-last-activity", {})
        .then(() => {
          console.log("lastUpdatedAt 갱신");
        })
        .catch((err) => {
          console.error("갱신 실패", err);
        });
    }, 60_000);
    return () => clearInterval(interval);
  }, [loading, isLoggedIn]);

  if (loading) return null;

  return (
    <PlaytimeContext.Provider value={{ currentPlaytime, setCurrentPlaytime, stopTimer }}>
      {children}
    </PlaytimeContext.Provider>
  );
};

export const usePlaytime = () => useContext(PlaytimeContext);
