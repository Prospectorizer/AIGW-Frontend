"use client";

import { useCallback, useEffect, useState } from "react";
import { getAigw } from "@/lib/aigw/client";

export type ApiState = "loading" | "connected" | "error";

export function useAigw<T>(path: string, fallback: T, refreshMs = 15_000) {
  const [data, setData] = useState<T>(fallback);
  const [state, setState] = useState<ApiState>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getAigw<T>(path, signal);
      setData(result);
      setState("connected");
      setError(null);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setState("error");
      setError(caught instanceof Error ? caught.message : "Could not reach the gateway");
    }
  }, [path]);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void refresh(controller.signal), 0);
    const interval = window.setInterval(() => void refresh(), refreshMs);
    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh, refreshMs]);

  return { data, state, error, refresh: () => refresh() };
}
