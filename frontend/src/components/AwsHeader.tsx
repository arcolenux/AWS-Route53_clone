"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface AwsHeaderProps {
  user: { display_name: string; email: string } | null;
}

export default function AwsHeader({ user }: AwsHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearSession();
    router.replace("/login");
  };

  return (
    <header
      style={{
        background: "#232f3e",
        height: 48,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        borderBottom: "1px solid #1a242e",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* AWS Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
          <text
            x="0"
            y="20"
            fontSize="13"
            fontWeight="700"
            fontFamily="Arial, sans-serif"
            fill="#ff9900"
          >
            aws
          </text>
        </svg>
        <div style={{ width: 1, height: 20, background: "#546273" }} />
        <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>
          Console
        </span>
      </Link>

      {/* Services breadcrumb */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#8d99a5", fontSize: 13 }}>Services</span>
        <span style={{ color: "#546273" }}>›</span>
        <span style={{ color: "#cdd7e0", fontSize: 13 }}>Route 53</span>
      </div>

      {/* Region indicator */}
      <div
        style={{
          color: "#cdd7e0",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
        }}
      >
        <span style={{ fontSize: 11 }}>🌐</span>
        <span>Global</span>
        <span style={{ fontSize: 10, color: "#8d99a5" }}>▾</span>
      </div>

      {/* User menu */}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              color: "#cdd7e0",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 4,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#ff9900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {user.display_name[0].toUpperCase()}
            </div>
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.display_name}
            </span>
            <span style={{ fontSize: 10, color: "#8d99a5" }}>▾</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #546273",
              borderRadius: 4,
              color: "#cdd7e0",
              fontSize: 12,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}

      {/* Support */}
      <div style={{ color: "#8d99a5", fontSize: 12, cursor: "pointer" }}>
        Support ▾
      </div>
    </header>
  );
}
