import { eq } from "drizzle-orm";
import { canAccessFront } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { fronts, projects } from "../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const candidates = await context.db.select().from(fronts).orderBy(fronts.createdAt);
  const visible = await Promise.all(candidates.map(async (front) => {
    if (!await canAccessFront(context.db, context.user.id, front.id, context.space.id, "view")) return null;
    const [project] = await context.db.select({ id: projects.id, title: projects.title }).from(projects).where(eq(projects.id, front.projectId)).limit(1);
    return project ? { ...front, projectTitle: project.title } : null;
  }));
  return Response.json({ fronts: visible.filter((front): front is NonNullable<typeof front> => front !== null) });
}
