import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl = (process.env.AIGW_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");
const sessionCookie = "aigw_session";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = new URL(`${backendUrl}/${path.join("/")}`);
  target.search = incoming.search;
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const gatewayApiKey = request.headers.get("x-gateway-api-key");
  if (path[0] === "v1" && gatewayApiKey) headers.set("Authorization", `Bearer ${gatewayApiKey}`);
  else if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "The AI Gateway backend is unavailable. Start the Go server and try again." },
      { status: 503 },
    );
  }
  const body = await response.arrayBuffer();
  const outgoing = new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });

  if (response.ok && (path.join("/") === "api/auth/login" || path.join("/") === "api/auth/register")) {
    const payload = JSON.parse(new TextDecoder().decode(body)) as { data?: { token?: string; expires_at?: string } };
    if (payload.data?.token) {
      outgoing.cookies.set(sessionCookie, payload.data.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: payload.data.expires_at ? new Date(payload.data.expires_at) : undefined,
      });
      delete payload.data.token;
      return NextResponse.json(payload, { status: response.status, headers: outgoing.headers });
    }
  }
  if (path.join("/") === "api/auth/logout") outgoing.cookies.delete(sessionCookie);
  return outgoing;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
