import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl = (process.env.AIGW_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aigw_session")?.value;

  if (token) {
    try {
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
    } catch {
      // Local logout must still succeed when the backend is temporarily unavailable.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("aigw_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
