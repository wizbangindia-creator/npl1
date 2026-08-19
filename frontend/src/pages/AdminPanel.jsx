import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Save, Home as HomeIcon, Crown, Clock, Pause, Play, KeyRound, ShieldCheck } from "lucide-react";

export default function AdminPanel() {
  const [upcoming, setUpcoming] = useState(null);
  const [edit, setEdit] = useState({ a: "", b: "", c: "" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyHold, setBusyHold] = useState(false);

  const [superDraw, setSuperDraw] = useState(null);
  const [superEdit, setSuperEdit] = useState("");
  const [savingSuper, setSavingSuper] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const nav = useNavigate();
  const adminEmail = localStorage.getItem("ss_admin_email");
  const dirtyRef = useRef(false);
  const slotKeyRef = useRef(null);
  dirtyRef.current = dirty;

  const handleAuthError = (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("ss_admin_token");
      nav("/admin/login");
      return true;
    }
    return false;
  };

  const loadUpcoming = async () => {
    try {
      const res = await api.get("/admin/board/upcoming");
      setUpcoming(res.data);
      const slot = res.data?.slot;
      const key = slot ? `${slot.hour}:${slot.minute}` : null;
      if (key !== slotKeyRef.current) {
        // Slot changed -> load its values fresh
        slotKeyRef.current = key;
        if (slot) setEdit({ a: slot.a, b: slot.b, c: slot.c });
        setDirty(false);
      } else if (slot && !dirtyRef.current) {
        // Same slot, no local edits -> keep synced with server
        setEdit({ a: slot.a, b: slot.b, c: slot.c });
      }
    } catch (err) {
      handleAuthError(err);
    }
  };

  const loadSuper = async () => {
    try {
      const res = await api.get("/admin/superdraw/today");
      setSuperDraw(res.data);
      setSuperEdit((prev) => (prev === "" ? res.data?.number || "" : prev));
    } catch (err) {
      handleAuthError(err);
    }
  };

  useEffect(() => {
    loadUpcoming();
    loadSuper();
    const t = setInterval(() => {
      loadUpcoming();
      loadSuper();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDigit = (key, val) => {
    setEdit((prev) => ({ ...prev, [key]: val.replace(/\D/g, "").slice(0, 2) }));
    setDirty(true);
  };

  const slot = upcoming?.slot;
  const held = !!slot?.held;
  const released = !!slot?.released;
  const remaining = upcoming?.hold_remaining_seconds;
  const timeReached = !!upcoming?.time_reached;

  const saveSlot = async () => {
    if (!slot) return;
    const { a, b, c } = edit;
    if ([a, b, c].some((v) => !/^\d{2}$/.test(String(v)))) {
      toast.error("Each column needs a full 2-digit number (00-99)");
      return;
    }
    setSaving(true);
    try {
      await api.put("/board/slot", { date: upcoming.date, hour: slot.hour, minute: slot.minute, a, b, c });
      toast.success(`Saved ${slot.time}`);
      setDirty(false);
      await loadUpcoming();
    } catch (err) {
      if (!handleAuthError(err)) toast.error(formatApiError(err?.response?.data?.detail) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const holdResult = async () => {
    if (!slot) return;
    setBusyHold(true);
    try {
      await api.post("/board/slot/hold", { date: upcoming.date, hour: slot.hour, minute: slot.minute });
      toast.success("Result on hold — release within 60s or it auto-reveals");
      await loadUpcoming();
    } catch (err) {
      if (!handleAuthError(err)) toast.error(formatApiError(err?.response?.data?.detail) || "Hold failed");
    } finally {
      setBusyHold(false);
    }
  };

  const releaseResult = async () => {
    if (!slot) return;
    setBusyHold(true);
    try {
      await api.post("/board/slot/release", { date: upcoming.date, hour: slot.hour, minute: slot.minute });
      toast.success("Result released");
      await loadUpcoming();
    } catch (err) {
      if (!handleAuthError(err)) toast.error(formatApiError(err?.response?.data?.detail) || "Release failed");
    } finally {
      setBusyHold(false);
    }
  };

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
      if (!handleAuthError(err)) toast.error(formatApiError(err?.response?.data?.detail) || "Save failed");
    } finally {
      setSavingSuper(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setSavingPwd(true);
    try {
      await api.post("/auth/change-password", { current_password: pwd.current, new_password: pwd.next });
      toast.success("Password changed successfully");
      setPwd({ current: "", next: "", confirm: "" });
    } catch (err) {
      if (!handleAuthError(err)) toast.error(formatApiError(err?.response?.data?.detail) || "Password change failed");
    } finally {
      setSavingPwd(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("ss_admin_token");
    localStorage.removeItem("ss_admin_email");
    nav("/");
  };

  return (
    <div className="ss-page">
      <div className="ss-container">
        <header className="ss-admin-header">
          <div>
            <h1 className="ss-admin-title">Admin Panel</h1>
            <p className="ss-admin-sub" data-testid="admin-email">Signed in as {adminEmail}</p>
          </div>
          <div className="ss-admin-actions">
            <Link to="/" className="ss-btn-ghost" data-testid="admin-home-link">
              <HomeIcon size={14} /> View board
            </Link>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="admin-logout">
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </header>

        <div className="ss-admin-clock" data-testid="admin-clock">
          <Clock size={14} /> IST {upcoming?.current_time_ist || "--:--:--"}
        </div>

        {/* Upcoming slot changer */}
        <div className="ss-card ss-upcoming-card" data-testid="admin-upcoming-card">
          <div className="ss-upcoming-head">
            <span className="ss-upcoming-label">Upcoming Draw</span>
            {slot ? (
              <span className="ss-upcoming-time" data-testid="admin-upcoming-time">{slot.time}</span>
            ) : (
              <span className="ss-upcoming-time">— no more draws today —</span>
            )}
          </div>

          {slot && (
            <>
              <div className="ss-upcoming-status" data-testid="admin-upcoming-status">
                {!timeReached && !held && "Not yet revealed · set numbers now"}
                {!timeReached && held && "Armed to hold when reveal time arrives"}
                {timeReached && held && !released && remaining != null && (
                  <span className="ss-hold-live">Holding — auto-reveals in {remaining}s</span>
                )}
                {timeReached && (released || !held) && "Revealing now"}
              </div>

              <div className="ss-upcoming-inputs">
                <div className="ss-upcoming-col">
                  <span className="ss-upcoming-col-label col-a-h">A</span>
                  <Input
                    value={edit.a}
                    onChange={(e) => setDigit("a", e.target.value)}
                    maxLength={2}
                    className="ss-admin-input col-a-input"
                    data-testid="admin-upcoming-a"
                  />
                </div>
                <div className="ss-upcoming-col">
                  <span className="ss-upcoming-col-label col-b-h">B</span>
                  <Input
                    value={edit.b}
                    onChange={(e) => setDigit("b", e.target.value)}
                    maxLength={2}
                    className="ss-admin-input col-b-input"
                    data-testid="admin-upcoming-b"
                  />
                </div>
                <div className="ss-upcoming-col">
                  <span className="ss-upcoming-col-label col-c-h">C</span>
                  <Input
                    value={edit.c}
                    onChange={(e) => setDigit("c", e.target.value)}
                    maxLength={2}
                    className="ss-admin-input col-c-input"
                    data-testid="admin-upcoming-c"
                  />
                </div>
              </div>

              <div className="ss-upcoming-actions">
                <Button onClick={saveSlot} disabled={saving} className="ss-btn-primary" data-testid="admin-upcoming-save">
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </Button>
                {(!held || released) ? (
                  <Button
                    variant="outline"
                    onClick={holdResult}
                    disabled={busyHold}
                    data-testid="admin-upcoming-hold"
                  >
                    <Pause size={14} /> Hold Result
                  </Button>
                ) : (
                  <Button
                    onClick={releaseResult}
                    disabled={busyHold}
                    className="ss-btn-primary"
                    data-testid="admin-upcoming-release"
                  >
                    <Play size={14} /> Release {remaining != null ? `(${remaining}s)` : ""}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Super draw */}
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
              <Button onClick={saveSuper} disabled={savingSuper} className="ss-btn-primary" data-testid="admin-super-save">
                <Save size={14} /> {savingSuper ? "Saving..." : "Save"}
              </Button>
              <span className="ss-super-hint">
                {superDraw.revealed ? "Live · publicly visible now" : `Reveals at ${superDraw.reveal_time}`}
              </span>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="ss-super-editor" data-testid="admin-password-editor">
          <div className="ss-super-editor-head">
            <KeyRound size={16} />
            <span className="ss-super-editor-title">Change Login Password</span>
          </div>
          <form onSubmit={changePassword} className="ss-password-form">
            <div>
              <Label htmlFor="cur-pwd">Current password</Label>
              <Input
                id="cur-pwd"
                type="password"
                value={pwd.current}
                required
                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                data-testid="admin-pwd-current"
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="new-pwd">New password</Label>
              <Input
                id="new-pwd"
                type="password"
                value={pwd.next}
                required
                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                data-testid="admin-pwd-new"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pwd">Confirm new password</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={pwd.confirm}
                required
                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                data-testid="admin-pwd-confirm"
                placeholder="Re-enter new password"
              />
            </div>
            <Button type="submit" disabled={savingPwd} className="ss-btn-primary" data-testid="admin-pwd-submit">
              <ShieldCheck size={14} /> {savingPwd ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
