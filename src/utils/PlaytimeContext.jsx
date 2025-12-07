import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const PlaytimeContext = createContext();

const TARGET_COUNTS = [100, 250, 500, 750, 1000];
const MAX_COUNT = TARGET_COUNTS[TARGET_COUNTS.length - 1];

export const PlaytimeProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlaytime, setCurrentPlaytime] = useState(0);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const latencyRef = useRef([]);
  const serverProcRef = useRef([]);
  const dbToServerRef = useRef([]);

  const logStats = (label, arr) => {
    const n = arr.length;
    if (!TARGET_COUNTS.includes(n)) return;

    const sum = arr.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    const sorted = [...arr].sort((a, b) => a - b);
    const getPercentile = (p) => {
      const idx = p * (n - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      if (lower === upper) return sorted[lower];
      const weight = idx - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };
    const p95 = getPercentile(0.95);
    const p99 = getPercentile(0.99);

    console.log(
      `[HES][${label}] n=${n}, ` +
      `평균=${mean.toFixed(2)} ms, ` +
      `표준편차=${std.toFixed(2)} ms, ` +
      `P95=${p95.toFixed(2)} ms, ` +
      `P99=${p99.toFixed(2)} ms`
    );
  };

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
      api.post("/update-last-activity", {}).then(() => {console.log("lastUpdatedAt 갱신");}).catch((err) => {console.error("갱신 실패", err);});
    }, 60_000);
    return () => clearInterval(interval);
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (loading || !isLoggedIn) return;
    let count = 0;

    const intervalId = setInterval(async () => {
      count += 1;
      try {
        await api.post("/playtime-increment-test", { amount: 60 });
        console.log(`[테스트] ${count}회차 playtime 갱신 요청`);
      } catch (err) {
        console.error("플레이타임 테스트 갱신 실패", err);
      }

      if (count >= MAX_COUNT) {
        clearInterval(intervalId);
        console.log("[테스트] 1000회 갱신 완료, 테스트 타이머 중지");
      }
    }, 60_000);

    return () => clearInterval(intervalId);
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (loading || !isLoggedIn) return;
    let active = true;

    const longPoll = async () => {
      try {
        const t_requestSent = performance.now();

        const res = await api.get("/playtime-longpoll", {
          params: { since: currentPlaytime },
          timeout: 610_000,
          validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
        });

        const t_responseArrived = performance.now();
        const totalRoundTrip = t_responseArrived - t_requestSent;

        console.log(`[HES] 전체 왕복 시간: ${totalRoundTrip.toFixed(2)} ms`);
        latencyRef.current.push(totalRoundTrip);
        logStats("전체 지연시간", latencyRef.current);

        const serverProcessHeader = res.headers["x-server-process-time"];
        if (serverProcessHeader !== undefined) {
          const serverProcess = Number(serverProcessHeader);
          console.log(`[HES] 서버 내부 처리 시간: ${serverProcess.toFixed(2)} ms`);
          serverProcRef.current.push(serverProcess);
          logStats("서버 내부 처리시간", serverProcRef.current);
        }

        const dbToServerHeader = res.headers["x-db-to-server-time"];
        if (dbToServerHeader !== undefined) {
          const dbToServer = Number(dbToServerHeader);
          console.log(`[HES] Firestore→서버 전달 시간: ${dbToServer.toFixed(2)} ms`);
          dbToServerRef.current.push(dbToServer);
          logStats("DB→서버 전달시간", dbToServerRef.current);
        }

        if (!active) return;

        if (res.status !== 204) { setCurrentPlaytime(res.data.playtime); }

        if (active) longPoll();
      } catch (err) {
        console.error("long polling 에러:", err?.message || err);
        if (active) setTimeout(longPoll, 5000);
      }
    };

    longPoll();
    return () => { active = false; };
  }, [loading, isLoggedIn, currentPlaytime]);

  if (loading) return null;

  return (
    <PlaytimeContext.Provider value={{ currentPlaytime, setCurrentPlaytime, stopTimer }}>
      {children}
    </PlaytimeContext.Provider>
  );
};

export const usePlaytime = () => useContext(PlaytimeContext);
