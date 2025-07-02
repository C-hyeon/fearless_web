import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { parseTimeString } from "./formatTime";

const PlaytimeContext = createContext();

export const PlaytimeProvider = ({ children }) => {
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const initPlaytime = async () => {
      try {
        const res = await axios.get("http://localhost:5000/status", {
          withCredentials: true,
        });

        if (res.data.loggedIn) {
          const initialSeconds = parseTimeString(res.data.user.playtime || "00:00:00");
          const lastUpdatedAt = new Date(res.data.user.lastUpdatedAt || new Date());
          const now = new Date();

          // 로그인 이후 경과 시간만 계산
          const elapsedSeconds = Math.floor((now - lastUpdatedAt) / 1000);
          const total = initialSeconds + elapsedSeconds;

          setCurrentPlaytime(total);

          timerRef.current = setInterval(() => {
            setCurrentPlaytime((prev) => prev + 1);
          }, 1000);
        }
      } catch (err) {
        console.error("Playtime 초기화 실패", err);
      }
    };

    if (!initializedRef.current) {
      initializedRef.current = true;
      initPlaytime();
    }

    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <PlaytimeContext.Provider value={{ currentPlaytime, setCurrentPlaytime }}>
      {children}
    </PlaytimeContext.Provider>
  );
};

export const usePlaytime = () => useContext(PlaytimeContext);
