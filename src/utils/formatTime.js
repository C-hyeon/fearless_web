// 초를 "00:00:00" 문자열로 변환
export function formatSeconds(seconds) {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
}

// "00:00:00" 문자열을 초 단위로 변환
export function parseTimeString(timeString) {
    if(!timeString || typeof timeString !== "string") return 0;
    const [hrs, mins, secs] = timeString.split(":").map(Number);
    return hrs * 3600 + mins * 60 + secs;
}