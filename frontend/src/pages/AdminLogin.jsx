import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("ss_admin_token", res.data.token);
      localStorage.setItem("ss_admin_email", res.data.email);
      toast.success("Signed in successfully");
      nav("/admin");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ss-page ss-login-page">
      <div className="ss-login-card" data-testid="ss-login-card">
        <Link to="/" className="ss-back-link" data-testid="ss-back-link">
          <ArrowLeft size={14} /> Back to board
        </Link>
        <div className="ss-login-icon"><Lock size={22} /></div>
        <h2 className="ss-login-title">Admin Sign In</h2>
        <p className="ss-login-sub">Curate today&apos;s numbers</p>
        <form onSubmit={submit} className="ss-login-form">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              required
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
              placeholder="admin@shivshakti.local"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="ss-btn-primary"
            data-testid="login-submit"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
