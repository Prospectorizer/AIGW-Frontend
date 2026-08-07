import type { ApiEnvelope } from "./types";

export class AigwApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AigwApiError";
  }
}

const API_URL = (process.env.NEXT_PUBLIC_AIGW_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

export async function getAigw<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
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
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: gatewayHeaders(path),
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

function gatewayHeaders(path: string): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.NEXT_PUBLIC_AIGW_GATEWAY_API_KEY;
  if (apiKey && path.startsWith("/v1/")) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function isEnvelope<T>(value: ApiEnvelope<T> | T): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "ok" in value;
}
