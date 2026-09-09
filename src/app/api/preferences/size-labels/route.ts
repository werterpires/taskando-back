import { eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { personalSizeLabels } from "../../../../db/schema";

const defaults = ["Muito pequeno", "Pequeno", "Médio", "Grande", "Muito grande"];
const normalize = (value: unknown) => Array.isArray(value) && value.length === 5 && value.every((label) => typeof label === "string" && label.trim().length > 0 && label.trim().length <= 40) ? value.map((label) => label.trim().replace(/\s+/g, " ")) : null;

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [stored] = await context.db.select().from(personalSizeLabels).where(eq(personalSizeLabels.personalSpaceId, context.space.id)).limit(1);
  let labels = defaults;
  try { const parsed = stored ? normalize(JSON.parse(stored.labelsJson)) : null; if (parsed) labels = parsed; } catch { /* mantém o padrão */ }
  return Response.json({ labels });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const labels = normalize((await request.json() as { labels?: unknown }).labels);
  if (!labels) return Response.json({ error: "Informe exatamente cinco rótulos de tamanho, com até 40 caracteres cada." }, { status: 400 });
  await context.db.insert(personalSizeLabels).values({ personalSpaceId: context.space.id, labelsJson: JSON.stringify(labels), updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: personalSizeLabels.personalSpaceId, set: { labelsJson: JSON.stringify(labels), updatedAt: new Date().toISOString() } });
  return Response.json({ labels });
}
