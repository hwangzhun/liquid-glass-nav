export type D1Result<T = unknown> = { results?: T[]; success: boolean; meta?: Record<string, unknown> };

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export type CloudflareEnv = {
  NAV_DB: D1Database;
  AI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  AI_BASE_URL?: string;
  OPENAI_BASE_URL?: string;
  AI_MODEL?: string;
  OPENAI_MODEL?: string;
  NAV_PASSWORD?: string;
};

export type PagesContext = { request: Request; env: CloudflareEnv };

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function workspaceId(request: Request) {
  const id = request.headers.get("x-workspace-id")?.trim() || "";
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(id)) throw new Error("无效的 workspace ID。");
  return id;
}

export async function requireAuthenticated(request: Request, env: CloudflareEnv) {
  const { hasValidSession } = await import("../shared/auth");
  if (await hasValidSession(request.headers.get("Cookie"), env.NAV_PASSWORD)) return null;
  return json({ error: "请先登录。" }, { status: 401 });
}
