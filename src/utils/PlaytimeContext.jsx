import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { parseTimeString, formatSeconds } from "./formatTime";

const PlaytimeContext = createContext();

export const PlaytimeProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);
  const sessionExpiredRef = useRef(false);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log("⏹️ 타이머 중단됨");
    }
  };

  const handleSessionExpired = async () => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;

    try {
      await axios.post("http://localhost:5000/save-playtime", {
        playtimeInSeconds: currentPlaytime
      }, { withCredentials: true });
    } catch (e) {
      console.error("플레이타임 저장 실패:", e);
    }

    stopTimer();
    alert("세션이 만료되어 로그아웃됩니다.");
    window.location.href = "/";
  };

  const checkAndRefreshToken = async () => {
    try {
      await axios.post("http://localhost:5000/refresh-token", {}, {
        withCredentials: true,
      });
      console.log("🔄 세션 자동 갱신됨");
    } catch (err) {
      console.error("토큰 갱신 실패:", err);
    }
  };

  useEffect(() => {
    const initPlaytime = async () => {
      try {
        const res = await axios.get("http://localhost:5000/status", {
          withCredentials: true,
        });

        if (!res.data.loggedIn) {
          stopTimer();
          setIsLoggedIn(false);
          console.log("⛔ 로그아웃 상태 확인됨 → 타이머 정지");
          return;
        }
        setIsLoggedIn(true);

        const initialSeconds = typeof res.data.user.playtime === "number" ? res.data.user.playtime : 0;
        const lastUpdatedAt = new Date(res.data.user.lastUpdatedAt || new Date());
        const now = new Date();
        const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));
        const total = initialSeconds + elapsedSeconds;

        setCurrentPlaytime(total);

        stopTimer();
        if (res.data.loggedIn) {
          timerRef.current = setInterval(() => {
            setCurrentPlaytime((prev) => prev + 1);
          }, 1000);
        }
      } catch (err) {
        console.error("Playtime 초기화 실패", err);
        stopTimer();
      } finally {
        setLoading(false);
      }
    };

    if (!initializedRef.current) {
      initializedRef.current = true;
      initPlaytime();
    }

    return () => {
      stopTimer();
      sessionExpiredRef.current = false;
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        stopTimer();
      } else if (document.visibilityState === "visible") {
        try {
          const res = await axios.get("http://localhost:5000/status", {
            withCredentials: true,
          });

          if (res.data.loggedIn) {
            const playtimeRaw = res.data.user.playtime;
            const initialSeconds = typeof playtimeRaw === "number" ? playtimeRaw : 0;

            const lastUpdatedAt = new Date(res.data.user.lastUpdatedAt || new Date());
            const now = new Date();
            const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));
            setCurrentPlaytime(initialSeconds + elapsedSeconds);

            stopTimer();
            timerRef.current = setInterval(() => {
              setCurrentPlaytime((prev) => prev + 1);
            }, 1000);

            await checkAndRefreshToken();
            console.log("👁️ 탭 복귀 → 세션 연장 완료");
          } else {
            stopTimer();
            console.warn("⛔ 복귀 시 세션 없음 → 타이머 정지");
          }
        } catch (err) {
          stopTimer();
          console.error("복귀 시 세션 확인 실패", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (loading || currentPlaytime === 0 || !isLoggedIn) return;

    const interval = setInterval(() => {
      axios.post("http://localhost:5000/update-last-activity", {
        playtimeInSeconds: currentPlaytime
      }, {withCredentials: true})
      .then(() => {
        console.log("🕒 lastUpdatedAt & playtime 갱신됨");
      }).catch((err) => {
        console.error("갱신 실패", err);
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [loading, currentPlaytime]);

  if (loading) return null;

  return (
    <PlaytimeContext.Provider value={{ currentPlaytime, setCurrentPlaytime, stopTimer }}>
      {children}
    </PlaytimeContext.Provider>
  );
};

export const usePlaytime = () => useContext(PlaytimeContext);
