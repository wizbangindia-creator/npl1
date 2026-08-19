import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Sparkles, Lock, Crown } from "lucide-react";
import HeroBanner from "@/components/HeroBanner";
import OnlineUsers from "@/components/OnlineUsers";

function formatDateISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Home() {
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(""); // '' = today (live)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());
  const latestRowRef = useRef(null);

  const isLive = selectedDate === "";

  const fetchBoard = async () => {
    try {
      const url = isLive ? "/board/today" : `/board/date/${selectedDate}`;
      const res = await api.get(url);
      setData(res.data);
      setError(null);
    } catch (e) {
      const msg = formatApiError(e?.response?.data?.detail) || "Failed to load board";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBoard();
    if (isLive) {
      const dataInterval = setInterval(fetchBoard, 15000);
      const clockInterval = setInterval(() => setNow(new Date()), 1000);
      return () => {
        clearInterval(dataInterval);
        clearInterval(clockInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const istClock = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const revealedCount = data?.slots?.filter((s) => s.revealed).length ?? 0;
  const totalCount = data?.slots?.length ?? 0;
  const latestIdx = data?.latest_slot_index ?? -1;
  const latestSlot = latestIdx >= 0 ? data.slots[latestIdx] : null;
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <div className="ss-page" data-testid="ss-page">
      <div className="ss-container">
        <HeroBanner>
          <h1 className="ss-title" data-testid="ss-title">NPL1</h1>
          <div className="ss-title-underline" />
          <div className="ss-tag" data-testid="ss-tag">Main Board · 63 draws per day</div>
          <div className="ss-online-row">
            <OnlineUsers />
          </div>
          <div className="ss-sub">
            <span data-testid="ss-date">{data ? formatDateISO(data.date) : "—"}</span>
            <span className="ss-divider">·</span>
            <span data-testid="ss-clock">IST&nbsp;{istClock}</span>
            <span className="ss-divider">·</span>
            <span data-testid="ss-progress">{revealedCount}/{totalCount} revealed</span>
          </div>

          <div className="ss-toolbar">
            <Link to="/super-draw" className="ss-nav-link" data-testid="ss-nav-super">
              <Crown size={14} /> Super Draw
            </Link>
            <div className="ss-date-picker">
              <CalendarDays size={16} className="ss-icon-muted" />
              <Input
                type="date"
                value={selectedDate}
                max={todayIST}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ss-date-input"
                data-testid="ss-date-picker"
              />
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate("")}
                  data-testid="ss-back-today"
                  className="ss-btn-ghost-sm"
                >
                  Live today
                </Button>
              )}
            </div>
            <Link to="/admin/login" className="ss-admin-link" data-testid="ss-admin-link">
              <Lock size={14} /> Admin
            </Link>
          </div>
        </HeroBanner>

        {latestSlot && data?.is_today && (
          <div className="ss-latest-card" data-testid="ss-latest-card">
            <div className="ss-latest-side">
              <div className="ss-latest-label">
                <Sparkles size={14} /> Latest Draw
              </div>
              <div className="ss-latest-time" data-testid="ss-latest-time">
                {latestSlot.time}
              </div>
            </div>
            <div className="ss-latest-nums">
              <div className="ss-latest-num col-a" data-testid="ss-latest-a">
                <span className="ss-latest-num-label">A</span>
                <span className="ss-latest-num-value">{latestSlot.a}</span>
              </div>
              <div className="ss-latest-num col-b" data-testid="ss-latest-b">
                <span className="ss-latest-num-label">B</span>
                <span className="ss-latest-num-value">{latestSlot.b}</span>
              </div>
              <div className="ss-latest-num col-c" data-testid="ss-latest-c">
                <span className="ss-latest-num-label">C</span>
                <span className="ss-latest-num-value">{latestSlot.c}</span>
              </div>
            </div>
          </div>
        )}

        <div className="ss-card" data-testid="ss-table-card">
          <div className="ss-table-wrap">
            <table className="ss-table" data-testid="ss-table">
              <thead>
                <tr>
                  <th className="ss-col-time-h">Time</th>
                  <th className="col-a-h">A</th>
                  <th className="col-b-h">B</th>
                  <th className="col-c-h">C</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="ss-empty" data-testid="ss-loading">
                      Loading board...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={4} className="ss-empty" data-testid="ss-error">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && data?.slots?.map((s, i) => {
                  const isLatest = i === latestIdx && data.is_today;
                  return (
                    <tr
                      key={`${s.hour}-${s.minute}`}
                      ref={isLatest ? latestRowRef : null}
                      className={`${s.revealed ? "row-revealed" : "row-pending"} ${isLatest ? "row-latest" : ""}`}
                      data-testid={`ss-row-${i}`}
                    >
                      <td className="ss-col-time" data-testid={`ss-row-${i}-time`}>
                        {isLatest && <span className="ss-latest-dot" aria-hidden />} {s.time}
                      </td>
                      <td className="ss-num col-a" data-testid={`ss-row-${i}-a`}>{s.revealed ? s.a : "—"}</td>
                      <td className="ss-num col-b" data-testid={`ss-row-${i}-b`}>{s.revealed ? s.b : "—"}</td>
                      <td className="ss-num col-c" data-testid={`ss-row-${i}-c`}>{s.revealed ? s.c : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="ss-footer">
          <span>
            {isLive
              ? "Numbers reveal live as their IST time arrives · Board auto-refreshes every 15 seconds"
              : `Viewing archived board for ${data ? formatDateISO(data.date) : selectedDate}`}
          </span>
        </footer>
      </div>
    </div>
  );
}
