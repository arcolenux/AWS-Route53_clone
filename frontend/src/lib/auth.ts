"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const tokenKey = "route53_token";
export const userKey = "route53_user";

export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tokenKey);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(userKey);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser, token: string) {
  window.localStorage.setItem(tokenKey, token);
  window.localStorage.setItem(userKey, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(userKey);
}

export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    }
    // Re-validate against the API
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((u) => {
        setSession(u, token);
        setUser(u);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}