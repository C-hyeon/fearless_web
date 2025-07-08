import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { parseTimeString } from "./formatTime";

const PlaytimeContext = createContext();

export const PlaytimeProvider = ({ children }) => {
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);
  const sessionExpiredRef = useRef(false);

  const handleSessionExpired = async () => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;

    try {
      await axios.post("http://localhost:5000/save-playtime", {
        playtime: new Date(currentPlaytime * 1000).toISOString().substr(11, 8),
      }, { withCredentials: true });
    } catch (e) {
      console.error("플레이타임 저장 실패:", e);
    }

    clearInterval(timerRef.current);
    alert("세션이 만료되어 로그아웃됩니다.");
    window.location.href = "/";
  };

  // ✅ 토큰 갱신 로직 (공통)
  const checkAndRefreshToken = async () => {
    try {
      const res = await axios.get("http://localhost:5000/token-info", {
        withCredentials: true,
      });

      if (!res.data.loggedIn) return;

      const exp = res.data.exp * 1000;
      const now = Date.now();
      const timeLeft = exp - now;

      if (timeLeft < 5 * 60 * 1000) {
        await axios.post("http://localhost:5000/refresh-token", {}, {
          withCredentials: true,
        });
        console.log("세션 자동 갱신됨");
      }
    } catch (err) {
      console.error("토큰 만료시간 확인 또는 갱신 실패:", err);
    }
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
          const elapsedSeconds = Math.floor((now - lastUpdatedAt) / 1000);
          const total = initialSeconds + elapsedSeconds;

          setCurrentPlaytime(total);

          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCurrentPlaytime((prev) => prev + 1);
          }, 1000);
        } else {
          console.log("비로그인 상태, 플레이타임 미적용");
        }

        // ✅ 세션 확인 후 만료 임박하면 토큰 갱신 시도
        await checkAndRefreshToken();

      } catch (err) {
        console.error("Playtime 초기화 실패", err);
      } finally {
        setLoading(false);
      }
    };

    if (!initializedRef.current) {
      initializedRef.current = true;
      initPlaytime();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
          } else {
            console.log("세션 없음, 타이머 재시작 안함");
          }

          // ✅ 탭 복귀 시 토큰 만료 임박 시 자동 연장
          await checkAndRefreshToken();

        } catch (err) {
          console.error("탭 복귀 시 세션 확인 실패", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  if (loading) return null;

  return (
    <PlaytimeContext.Provider value={{ currentPlaytime, setCurrentPlaytime }}>
      {children}
    </PlaytimeContext.Provider>
  );
};

export const usePlaytime = () => useContext(PlaytimeContext);
