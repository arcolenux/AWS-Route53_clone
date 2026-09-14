"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Status = "checking" | "waking" | "ready" | "error" | "hidden";

export function BackendWarmup() {
  const [status, setStatus] = useState<Status>("checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let timeoutTimer: NodeJS.Timeout | null = null;
    let retryInterval: NodeJS.Timeout | null = null;

    const ping = async () => {
      // Set a timer: if backend takes longer than 2s to respond, it is likely sleeping (Render cold start)
      timeoutTimer = setTimeout(() => {
        if (isMounted && status !== "ready") {
          setStatus("waking");
        }
      }, 2000);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch(`${BASE_URL}/api/health`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);

        if (res.ok && isMounted) {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          setStatus("ready");
          // Hide toast after 3 seconds
          setTimeout(() => {
            if (isMounted) setStatus("hidden");
          }, 3500);
          return true;
        }
      } catch {
        // Ignored, will retry
      }

      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (isMounted) {
        setStatus("waking");
        setRetryCount((prev) => prev + 1);
      }
      return false;
    };

    // First attempt immediately on page load to trigger Render wake-up
    ping().then((success) => {
      if (!success && isMounted) {
        // Poll every 4 seconds until awake
        retryInterval = setInterval(async () => {
          const ok = await ping();
          if (ok && retryInterval) {
            clearInterval(retryInterval);
          }
        }, 4000);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (retryInterval) clearInterval(retryInterval);
    };
  }, []);

  if (status === "checking" || status === "hidden") {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        transition: "all 0.3s ease",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif)",
        background: status === "ready" ? "#0f5132" : "#1a2233",
        color: status === "ready" ? "#d1e7dd" : "#e2e8f0",
        border: `1px solid ${status === "ready" ? "#198754" : "#3b82f6"}`,
      }}
    >
      {status === "waking" && (
        <>
          <div
            style={{
              width: 14,
              height: 14,
              border: "2px solid rgba(59, 130, 246, 0.3)",
              borderTop: "2px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div>
            <span>⚡ <strong>Waking up backend server...</strong></span>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
              Render free instance cold start (~20-45s)
            </div>
          </div>
        </>
      )}

      {status === "ready" && (
        <>
          <span style={{ fontSize: 16 }}>✓</span>
          <div>
            <strong>Backend connected</strong>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Ready to handle requests</div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
