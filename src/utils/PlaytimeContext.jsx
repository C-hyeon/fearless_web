import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { parseTimeString } from "./formatTime";

const PlaytimeContext = createContext();

export const PlaytimeProvider = ({ children }) => {
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);  // 한 번만 실행되도록 제어

  useEffect(() => {
  const initPlaytime = async () => {
    try {
      const res = await axios.get("http://localhost:5000/status", {
        withCredentials: true,
      });

      if (res.data.loggedIn) {
        const initial = parseTimeString(res.data.user.playtime || "00:00:00");
        setCurrentPlaytime(initial);

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
    initPlaytime(); // → document.cookie 체크 없이 바로 실행
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