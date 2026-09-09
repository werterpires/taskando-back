export async function hashMcpToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export function createMcpToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "tsk_" + Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
export function readBearerToken(request: Request) {
  const match = /^Bearer[ \t]+(tsk_[a-f0-9]{64})$/i.exec((request.headers.get("authorization") ?? "").trim());
  return match?.[1] ?? null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
