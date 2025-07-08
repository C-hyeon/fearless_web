import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { parseTimeString } from "./formatTime";

const PlaytimeContext = createContext();

export const PlaytimeProvider = ({ children }) => {
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);

  const handleSessionExpired = async () => {
    try {
      await axios.post("http://localhost:5000/save-playtime", {
        playtime: new Date(currentPlaytime * 1000).toISOString().substr(11, 8)
      }, { withCredentials: true });
    } catch (e) {
      console.error("플레이타임 저장 실패:", e);
    }

    clearInterval(timerRef.current);
    alert("세션이 만료되어 로그아웃됩니다.");
    window.location.href = "/";
  };

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

          if (timerRef.current) {
            clearInterval(timerRef.current);
          }

          timerRef.current = setInterval(() => {
            setCurrentPlaytime((prev) => prev + 1);
          }, 1000);
        }
      } catch (err) {
        console.error("Playtime 초기화 실패", err);
        await handleSessionExpired();
      }
    };

    if (!initializedRef.current) {
      initializedRef.current = true;
      initPlaytime();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        clearInterval(timerRef.current);
      } else if (document.visibilityState === "visible") {
        try {
          const res = await axios.get("http://localhost:5000/status", {
            withCredentials: true,
          });

          if (res.data.loggedIn) {
            const initialSeconds = parseTimeString(res.data.user.playtime || "00:00:00");
            const lastUpdatedAt = new Date(res.data.user.lastUpdatedAt || new Date());
            const now = new Date();
            const elapsedSeconds = Math.floor((now - lastUpdatedAt) / 1000);
            setCurrentPlaytime(initialSeconds + elapsedSeconds);

            timerRef.current = setInterval(() => {
              setCurrentPlaytime((prev) => prev + 1);
            }, 1000);
          }
        } catch (err) {
          console.error("세션 갱신 실패 또는 만료", err);
          await handleSessionExpired();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);


  return (
    <PlaytimeContext.Provider value={{ currentPlaytime, setCurrentPlaytime }}>
      {children}
    </PlaytimeContext.Provider>
  );
};

export const usePlaytime = () => useContext(PlaytimeContext);
