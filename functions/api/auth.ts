import {
  clearSessionCookie,
  createSessionToken,
  hasValidSession,
  sessionCookie,
  timingSafeEqual,
} from "../../shared/auth";
import { json, type PagesContext } from "../_types";

function isSecure(request: Request) {
  return new URL(request.url).protocol === "https:";
}

export async function onRequestGet(context: PagesContext) {
  if (!context.env.NAV_PASSWORD) {
    return json({ authenticated: false, configured: false }, { status: 503 });
  }
  const authenticated = await hasValidSession(context.request.headers.get("Cookie"), context.env.NAV_PASSWORD);
  return json({ authenticated, configured: true }, { status: authenticated ? 200 : 401 });
}

export async function onRequestPost(context: PagesContext) {
  if (!context.env.NAV_PASSWORD) {
    return json({ error: "NAV_PASSWORD 尚未配置。", configured: false }, { status: 503 });
  }
  try {
    const body = await context.request.json() as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!timingSafeEqual(password, context.env.NAV_PASSWORD)) {
      return json({ error: "密码不正确。", configured: true }, { status: 401 });
    }
    const token = await createSessionToken(context.env.NAV_PASSWORD);
    return json(
      { authenticated: true, configured: true },
      { headers: { "Set-Cookie": sessionCookie(token, isSecure(context.request)) } },
    );
  } catch {
    return json({ error: "登录请求格式不正确。" }, { status: 400 });
  }
}

export async function onRequestDelete(context: PagesContext) {
  return json(
    { authenticated: false },
    { headers: { "Set-Cookie": clearSessionCookie(isSecure(context.request)) } },
  );
}
