"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerApi } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    display_name: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await registerApi(form.email, form.display_name, form.password);
      setSession(res.user, res.token);
      router.replace("/hosted-zones");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#232f3e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#ff9900", fontFamily: "Arial Black, sans-serif", letterSpacing: -2, lineHeight: 1 }}>
          aws
        </div>
        <div style={{ color: "#8d99a5", fontSize: 12, marginTop: 4 }}>Amazon Web Services</div>
      </div>

      <div style={{ background: "white", borderRadius: 4, boxShadow: "0 2px 16px rgba(0,0,0,0.3)", width: "100%", maxWidth: 400, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: "#16191f", marginBottom: 4 }}>Create account</h1>
          <p style={{ fontSize: 13, color: "#545b64", marginBottom: 20 }}>Route 53 Management Console</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px" }}>
          {error && (
            <div style={{ background: "#fdf5f3", border: "1px solid #d13212", borderRadius: 4, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#d13212", display: "flex", gap: 8 }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="aws-label" htmlFor="display_name">Full name</label>
            <input id="display_name" type="text" className="aws-input" value={form.display_name} onChange={set("display_name")} required autoFocus />
          </div>

          <div className="form-group">
            <label className="aws-label" htmlFor="email">Email address</label>
            <input id="email" type="email" className="aws-input" value={form.email} onChange={set("email")} required />
          </div>

          <div className="form-group">
            <label className="aws-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="aws-input" value={form.password} onChange={set("password")} minLength={8} required />
            <p className="form-hint">Minimum 8 characters</p>
          </div>

          <div className="form-group">
            <label className="aws-label" htmlFor="confirm_password">Confirm password</label>
            <input id="confirm_password" type="password" className="aws-input" value={form.confirmPassword} onChange={set("confirmPassword")} required />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#545b64" }}>
            Already have an account?{" "}
            <Link href="/login" className="btn-link">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
