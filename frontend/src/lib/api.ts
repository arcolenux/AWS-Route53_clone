"use client";

import { getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    let detail = "Request failed";
    if (body?.detail) {
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
      }
    }
    throw new ApiError(res.status, detail);
  }
  return body as T;
}

/** Build a query string from an object, omitting undefined values */
function toQS(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// Convenience helpers
export async function loginApi(email: string, password: string) {
  return apiFetch<{
    user: { id: string; email: string; display_name: string };
    token: string;
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  displayName: string,
  password: string
) {
  return apiFetch<{
    user: { id: string; email: string; display_name: string };
    token: string;
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, display_name: displayName, password }),
  });
}

export const hostedZonesApi = {
  list: (params: { search?: string; page?: number; page_size?: number }) =>
    apiFetch<{
      items: HostedZone[];
      total: number;
      page: number;
      page_size: number;
    }>(`/api/hosted-zones${toQS(params)}`),

  get: (id: string) =>
    apiFetch<HostedZone>(`/api/hosted-zones/${id}`),

  create: (data: { name: string; private?: boolean; description?: string }) =>
    apiFetch<HostedZone>("/api/hosted-zones", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiFetch<HostedZone>(`/api/hosted-zones/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/hosted-zones/${id}`, { method: "DELETE" }),
};

export const recordsApi = {
  list: (
    zoneId: string,
    params: { search?: string; type?: string; page?: number; page_size?: number }
  ) =>
    apiFetch<{
      items: DNSRecord[];
      total: number;
      page: number;
      page_size: number;
    }>(`/api/hosted-zones/${zoneId}/records${toQS(params)}`),

  get: (zoneId: string, recordId: string) =>
    apiFetch<DNSRecord>(`/api/hosted-zones/${zoneId}/records/${recordId}`),

  create: (zoneId: string, data: CreateRecordData) =>
    apiFetch<DNSRecord>(`/api/hosted-zones/${zoneId}/records`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    zoneId: string,
    recordId: string,
    data: { name?: string; ttl?: number; values?: string[]; comment?: string }
  ) =>
    apiFetch<DNSRecord>(`/api/hosted-zones/${zoneId}/records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (zoneId: string, recordId: string) =>
    apiFetch<void>(`/api/hosted-zones/${zoneId}/records/${recordId}`, {
      method: "DELETE",
    }),
};

// Types from API responses
export interface HostedZone {
  id: string;
  name: string;
  private: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  record_count: number;
}

export interface DNSRecord {
  id: string;
  zone_id: string;
  name: string;
  type: string;
  ttl: number;
  values: string[];
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRecordData {
  name: string;
  type: string;
  ttl: number;
  values: string[];
  comment?: string;
}