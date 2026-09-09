import { eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { mcpTokens } from "../../../db/schema";
import { createMcpToken, hashMcpToken, sameOrigin } from "../../../db/mcp-token-crypto";
import { takeRateLimit } from "../../../db/rate-limit";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return json({ error: "Não autenticado." }, 401);
  const [token] = await context.db.select({ prefix: mcpTokens.prefix, createdAt: mcpTokens.createdAt, lastUsedAt: mcpTokens.lastUsedAt }).from(mcpTokens).where(eq(mcpTokens.userId, context.user.id));
  return json({ token: token ?? null });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);
  const context = await ensurePersonalContext();
  if (!context) return json({ error: "Não autenticado." }, 401);
  if (!takeRateLimit(`mcp-token:${context.user.id}`, 10, 60000).allowed) return json({ error: "Aguarde um minuto antes de gerar outro token." }, 429);
  const token = createMcpToken();
  const metadata = { prefix: token.slice(0, 12), createdAt: new Date().toISOString(), lastUsedAt: null };
  await context.db.insert(mcpTokens).values({ userId: context.user.id, tokenHash: await hashMcpToken(token), ...metadata })
    .onConflictDoUpdate({ target: mcpTokens.userId, set: { tokenHash: await hashMcpToken(token), ...metadata } });
  return json({ secret: token, token: metadata }, 201);
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);
  const context = await ensurePersonalContext();
  if (!context) return json({ error: "Não autenticado." }, 401);
  await context.db.delete(mcpTokens).where(eq(mcpTokens.userId, context.user.id));
  return json({ ok: true });
}
