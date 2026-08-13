"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginApi } from "@/lib/api";
import { setSession, getToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@route53.example");
  const [password, setPassword] = useState("DemoPass123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) {
      router.replace("/hosted-zones");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      setSession(res.user, res.token);
      router.replace("/hosted-zones");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
      {/* AWS Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#ff9900",
            fontFamily: "Arial Black, sans-serif",
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          aws
        </div>
        <div style={{ color: "#8d99a5", fontSize: 12, marginTop: 4 }}>
          Amazon Web Services
        </div>
      </div>

      {/* Login Card */}
      <div
        style={{
          background: "white",
          borderRadius: 4,
          boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: 380,
          overflow: "hidden",
        }}
      >
        {/* Card Header */}
        <div style={{ padding: "20px 24px 0" }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: "#16191f",
              marginBottom: 4,
            }}
          >
            Sign in
          </h1>
          <p style={{ fontSize: 13, color: "#545b64", marginBottom: 20 }}>
            Route 53 Management Console
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px" }}>
          {error && (
            <div
              style={{
                background: "#fdf5f3",
                border: "1px solid #d13212",
                borderRadius: 4,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 13,
                color: "#d13212",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="aws-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="aws-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="aws-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="aws-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            style={{ width: "100%", marginTop: 8 }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: 13,
              color: "#545b64",
            }}
          >
            New user?{" "}
            <Link href="/register" className="btn-link">
              Create an account
            </Link>
          </div>
        </form>
      </div>

      {/* Demo credentials hint */}
      <div
        style={{
          marginTop: 16,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          padding: "12px 16px",
          fontSize: 12,
          color: "#8d99a5",
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div style={{ fontWeight: 600, color: "#cdd7e0", marginBottom: 4 }}>
          Demo Credentials
        </div>
        <div>Email: demo@route53.example</div>
        <div>Password: DemoPass123!</div>
      </div>

      <div style={{ color: "#546273", fontSize: 11, marginTop: 24 }}>
        © 2024, Amazon Web Services, Inc. (Route53 Clone Assignment)
      </div>
    </div>
  );
}
