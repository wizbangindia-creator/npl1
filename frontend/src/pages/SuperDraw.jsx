import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Sparkles, Lock, Home as HomeIcon, Crown } from "lucide-react";
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

export default function SuperDraw() {
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());

  const isLive = selectedDate === "";
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const fetchDraw = async () => {
    try {
      const url = isLive ? "/superdraw/today" : `/superdraw/date/${selectedDate}`;
      const res = await api.get(url);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(formatApiError(e?.response?.data?.detail) || "Failed to load super draw");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDraw();
    if (isLive) {
      const dataInterval = setInterval(fetchDraw, 15000);
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

  const revealed = data?.revealed;
  const number = data?.number;

  return (
    <div className="ss-page" data-testid="sd-page">
      <div className="ss-container">
        <HeroBanner>
          <h1 className="ss-title" data-testid="sd-title">NPL1</h1>
          <div className="ss-title-underline" />
          <div className="ss-tag" data-testid="sd-tag">
            <Crown size={14} /> Super Draw · One Number Per Day
          </div>
          <div className="ss-online-row">
            <OnlineUsers />
          </div>
          <div className="ss-sub">
            <span data-testid="sd-date">{data ? formatDateISO(data.date) : "—"}</span>
            <span className="ss-divider">·</span>
            <span data-testid="sd-clock">IST&nbsp;{istClock}</span>
            <span className="ss-divider">·</span>
            <span data-testid="sd-reveal-time">Reveals at {data?.reveal_time || "11:30 AM"}</span>
          </div>

          <div className="ss-toolbar">
            <Link to="/" className="ss-nav-link" data-testid="sd-nav-home">
              <HomeIcon size={14} /> Main Board
            </Link>
            <div className="ss-date-picker">
              <CalendarDays size={16} className="ss-icon-muted" />
              <Input
                type="date"
                value={selectedDate}
                max={todayIST}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ss-date-input"
                data-testid="sd-date-picker"
              />
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate("")}
                  data-testid="sd-back-today"
                  className="ss-btn-ghost-sm"
                >
                  Live today
                </Button>
              )}
            </div>
            <Link to="/admin/login" className="ss-admin-link" data-testid="sd-admin-link">
              <Lock size={14} /> Admin
            </Link>
          </div>
        </HeroBanner>

        <div className="sd-card" data-testid="sd-card">
          {loading && (
            <div className="ss-empty" data-testid="sd-loading">Loading super draw...</div>
          )}
          {!loading && error && (
            <div className="ss-empty" data-testid="sd-error">{error}</div>
          )}
          {!loading && !error && data && (
            <>
              <div className="sd-badge">
                <Sparkles size={14} />
                <span>Super Draw</span>
              </div>
              <div className="sd-label">Winning Number</div>
              {revealed ? (
                <div className="sd-number" data-testid="sd-number">{number}</div>
              ) : (
                <>
                  <div className="sd-number sd-number-locked" data-testid="sd-number-locked">
                    <span>?</span><span>?</span>
                  </div>
                  <div className="sd-locked-hint" data-testid="sd-locked-hint">
                    Unlocks today at {data.reveal_time} IST
                  </div>
                </>
              )}
              <div className="sd-date-info" data-testid="sd-date-info">
                {formatDateISO(data.date)} · {data.reveal_time}
              </div>
            </>
          )}
        </div>

        <footer className="ss-footer">
          <span>
            {isLive
              ? "One number per day · Auto-updates every 15 seconds"
              : `Viewing archived super draw for ${data ? formatDateISO(data.date) : selectedDate}`}
          </span>
        </footer>
      </div>
    </div>
  );
}
