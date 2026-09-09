import { ensurePersonalContext } from "../../../db/current-user";

export async function POST() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { user, space } = context;
  return Response.json({ user: { displayName: user.displayName, email: user.email }, space });
}
