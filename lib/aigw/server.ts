import "server-only";
import { cookies } from "next/headers";

const backendUrl = (process.env.AIGW_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

export type SessionInfo = {
  user: { user_id: number; email: string; display_name: string };
  workspaces: Array<{
    organization_slug: string;
    organization_name: string;
    project_slug: string | null;
    project_name: string | null;
    role: string;
  }>;
};

export async function getSession(): Promise<SessionInfo | null> {
  const token = (await cookies()).get("aigw_session")?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: SessionInfo };
    return payload.data ?? null;
  } catch {
    return null;
  }
}
