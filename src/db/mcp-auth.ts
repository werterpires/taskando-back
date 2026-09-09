import { eq } from "drizzle-orm";
import { getDb } from ".";
import { mcpTokens, users, personalSpaces } from "./schema";
import { hashMcpToken, readBearerToken } from "./mcp-token-crypto";
export async function authenticateMcp(request: Request) {
  const token = readBearerToken(request);
  if (!token) return null;
  const db = await getDb();
  const hash = await hashMcpToken(token);
  const [row] = await db.select({ user: users, space: personalSpaces }).from(mcpTokens)
    .innerJoin(users, eq(users.id, mcpTokens.userId))
    .innerJoin(personalSpaces, eq(personalSpaces.ownerUserId, users.id))
    .where(eq(mcpTokens.tokenHash, hash)).limit(1);
  if (!row) return null;
  await db.update(mcpTokens).set({ lastUsedAt: new Date().toISOString() }).where(eq(mcpTokens.tokenHash, hash));
  return { db, ...row };
}
