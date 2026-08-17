import type { ApiEnvelope } from "./types";

export class AigwApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AigwApiError";
  }
}

const API_URL = "/api/proxy";

export async function getAigw<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${scopePath(path)}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as ApiEnvelope<T> | T;
  if (!response.ok) {
    const message = isEnvelope(payload) && payload.error
      ? payload.error
      : `Gateway returned ${response.status}`;
    throw new AigwApiError(message, response.status);
  }
  if (isEnvelope(payload)) {
    if (!payload.ok || payload.data === undefined) {
      throw new AigwApiError(payload.error ?? "Invalid gateway response", response.status);
    }
    return payload.data;
  }
  return payload;
}

export async function postAigw<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${scopePath(path)}`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiEnvelope<T> | T;
  if (!response.ok) {
    const message = isEnvelope(payload) && payload.error
      ? payload.error
      : `Gateway returned ${response.status}`;
    throw new AigwApiError(message, response.status);
  }
  if (isEnvelope(payload)) {
    if (!payload.ok || payload.data === undefined) {
      throw new AigwApiError(payload.error ?? "Invalid gateway response", response.status);
    }
    return payload.data;
  }
  return payload;
}

function scopePath(path: string): string {
  if (typeof window === "undefined" || path.startsWith("/api/auth/")) return path;
  const match = window.location.pathname.match(/^\/dashboard\/([^/]+)\/([^/]+)/);
  if (!match) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("organization", decodeURIComponent(match[1]));
  url.searchParams.set("project", decodeURIComponent(match[2]));
  return `${url.pathname}${url.search}`;
}

function gatewayHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  return headers;
}

function isEnvelope<T>(value: ApiEnvelope<T> | T): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "ok" in value;
}
