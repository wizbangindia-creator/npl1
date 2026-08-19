import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, RefreshCw, Save, Home as HomeIcon, Dice5, Crown } from "lucide-react";

export default function AdminPanel() {
  const [data, setData] = useState(null);
  const [superDraw, setSuperDraw] = useState(null);
  const [superEdit, setSuperEdit] = useState("");
  const [savingSuper, setSavingSuper] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingIdx, setSavingIdx] = useState(-1);
  const [edits, setEdits] = useState({});
  const nav = useNavigate();
  const adminEmail = localStorage.getItem("ss_admin_email");
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const load = async (date) => {
    setLoading(true);
    try {
      const url = date ? `/admin/board/date/${date}` : "/admin/board/today";
      const res = await api.get(url);
      setData(res.data);
      setEdits({});
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("ss_admin_token");
        nav("/admin/login");
      } else {
        toast.error(formatApiError(err?.response?.data?.detail) || "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSuper = async () => {
    try {
      const res = await api.get("/admin/superdraw/today");
      setSuperDraw(res.data);
      setSuperEdit(res.data?.number || "");
    } catch (err) {
      if (err?.response?.status !== 401) {
        toast.error(formatApiError(err?.response?.data?.detail) || "Failed to load super draw");
      }
    }
  };

  useEffect(() => {
    load(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    loadSuper();
  }, []);

  const saveSuper = async () => {
    if (!/^\d{2}$/.test(superEdit)) {
      toast.error("Super draw must be a 2-digit number (00-99)");
      return;
    }
    setSavingSuper(true);
    try {
      await api.put("/superdraw", { date: superDraw.date, number: superEdit });
      toast.success("Super draw saved");
      await loadSuper();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Save failed");
    } finally {
      setSavingSuper(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("ss_admin_token");
    localStorage.removeItem("ss_admin_email");
    nav("/");
  };

  const getVal = (i, key) => {
    if (edits[i] && edits[i][key] !== undefined) return edits[i][key];
    return data?.slots?.[i]?.[key] ?? "";
  };
  const setVal = (i, key, val) => {
    val = val.replace(/\D/g, "").slice(0, 2);
    setEdits((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), [key]: val } }));
  };

  const saveRow = async (i) => {
    const slot = data.slots[i];
    const a = String(getVal(i, "a"));
    const b = String(getVal(i, "b"));
    const c = String(getVal(i, "c"));
    if ([a, b, c].some((v) => !/^\d{2}$/.test(v))) {
      toast.error("Each column needs a full 2-digit number (00-99)");
      return;
    }
    setSavingIdx(i);
    try {
      await api.put("/board/slot", {
        date: data.date,
        hour: slot.hour,
        minute: slot.minute,
        a, b, c,
      });
      toast.success(`Saved ${slot.time}`);
      await load(selectedDate);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Save failed");
    } finally {
      setSavingIdx(-1);
    }
  };

  const regenerate = async () => {
    if (!window.confirm("Regenerate ALL random numbers for today? Any manual edits will be lost.")) return;
    try {
      await api.post("/board/regenerate");
      toast.success("Today's numbers regenerated");
      setSelectedDate("");
      await load("");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Regenerate failed");
    }
  };

  return (
    <div className="ss-page">
      <div className="ss-container">
        <header className="ss-admin-header">
          <div>
            <h1 className="ss-admin-title">Admin Panel</h1>
            <p className="ss-admin-sub" data-testid="admin-email">
              Signed in as {adminEmail}
            </p>
          </div>
          <div className="ss-admin-actions">
            <Link to="/" className="ss-btn-ghost" data-testid="admin-home-link">
              <HomeIcon size={14} /> View board
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={regenerate}
              data-testid="admin-regenerate"
            >
              <Dice5 size={14} /> Regenerate today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="admin-logout"
            >
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </header>

        <div className="ss-admin-toolbar">
          <span className="ss-admin-picker-label">Date</span>
          <Input
            type="date"
            max={todayIST}
            value={selectedDate || todayIST}
            onChange={(e) => setSelectedDate(e.target.value === todayIST ? "" : e.target.value)}
            className="ss-date-input"
            data-testid="admin-date-picker"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load(selectedDate)}
            data-testid="admin-reload"
          >
            <RefreshCw size={14} /> Reload
          </Button>
        </div>

        {superDraw && (
          <div className="ss-super-editor" data-testid="admin-super-editor">
            <div className="ss-super-editor-head">
              <Crown size={16} />
              <span className="ss-super-editor-title">Super Draw (11:30 AM)</span>
              <span className="ss-super-editor-date">{superDraw.date}</span>
            </div>
            <div className="ss-super-editor-body">
              <Input
                value={superEdit}
                onChange={(e) => setSuperEdit(e.target.value.replace(/\D/g, "").slice(0, 2))}
                maxLength={2}
                className="ss-super-input"
                data-testid="admin-super-input"
                placeholder="00"
              />
              <Button
                onClick={saveSuper}
                disabled={savingSuper}
                className="ss-btn-primary"
                data-testid="admin-super-save"
              >
                <Save size={14} /> {savingSuper ? "Saving..." : "Save"}
              </Button>
              <span className="ss-super-hint">
                {superDraw.revealed
                  ? "Live · publicly visible now"
                  : `Reveals at ${superDraw.reveal_time}`}
              </span>
            </div>
          </div>
        )}

        <div className="ss-card">
          <div className="ss-table-wrap">
            <table className="ss-table ss-admin-table">
              <thead>
                <tr>
                  <th className="ss-col-time-h">Time</th>
                  <th className="col-a-h">A</th>
                  <th className="col-b-h">B</th>
                  <th className="col-c-h">C</th>
                  <th className="ss-col-action-h">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="ss-empty">Loading...</td></tr>
                )}
                {!loading && data?.slots?.map((s, i) => (
                  <tr key={`${s.hour}-${s.minute}`} data-testid={`admin-row-${i}`}>
                    <td className="ss-col-time">{s.time}</td>
                    <td>
                      <Input
                        value={getVal(i, "a")}
                        onChange={(e) => setVal(i, "a", e.target.value)}
                        className="ss-admin-input col-a-input"
                        maxLength={2}
                        data-testid={`admin-row-${i}-a`}
                      />
                    </td>
                    <td>
                      <Input
                        value={getVal(i, "b")}
                        onChange={(e) => setVal(i, "b", e.target.value)}
                        className="ss-admin-input col-b-input"
                        maxLength={2}
                        data-testid={`admin-row-${i}-b`}
                      />
                    </td>
                    <td>
                      <Input
                        value={getVal(i, "c")}
                        onChange={(e) => setVal(i, "c", e.target.value)}
                        className="ss-admin-input col-c-input"
                        maxLength={2}
                        data-testid={`admin-row-${i}-c`}
                      />
                    </td>
                    <td>
                      <Button
                        size="sm"
                        onClick={() => saveRow(i)}
                        disabled={savingIdx === i}
                        data-testid={`admin-row-${i}-save`}
                        className="ss-btn-primary"
                      >
                        <Save size={14} /> {savingIdx === i ? "Saving..." : "Save"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
