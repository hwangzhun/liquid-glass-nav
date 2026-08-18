export const AUTH_COOKIE_NAME = "tidal_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(password: string) {
  const payload = new TextEncoder().encode(`tidal/index:session:v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return toHex(new Uint8Array(digest));
}

export function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

export function timingSafeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function hasValidSession(cookieHeader: string | null | undefined, password: string | undefined) {
  if (!password) return false;
  const actual = readCookie(cookieHeader, AUTH_COOKIE_NAME);
  if (!actual) return false;
  const expected = await createSessionToken(password);
  return timingSafeEqual(actual, expected);
}

export function sessionCookie(token: string, secure: boolean) {
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_COOKIE_MAX_AGE}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean) {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
