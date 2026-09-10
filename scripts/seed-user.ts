import { eq } from 'drizzle-orm';
import { getDb, pool, transaction } from '../src/db';
import { passwordCredentials, personalSpaces, users } from '../src/db/schema';
import { hashPassword, isValidDisplayName, isValidEmail, isValidPassword, normalizeEmail } from '../src/auth/password';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes de executar a seed.');
  const displayName = (process.env.TASKANDO_SEED_NAME ?? 'Administrador').trim().replace(/\s+/g, ' ');
  const email = normalizeEmail(process.env.TASKANDO_SEED_EMAIL ?? 'admin@taskando.local');
  const password = process.env.TASKANDO_SEED_PASSWORD ?? '';
  if (!isValidDisplayName(displayName)) throw new Error('TASKANDO_SEED_NAME deve ter entre 2 e 80 caracteres.');
  if (!isValidEmail(email)) throw new Error('TASKANDO_SEED_EMAIL deve conter um e-mail válido.');
  if (!isValidPassword(password)) throw new Error('TASKANDO_SEED_PASSWORD deve ter entre 8 e 128 caracteres.');

  try {
    await transaction(async () => {
      const db = await getDb();
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = existing ?? (await db.insert(users).values({ id: crypto.randomUUID(), email, displayName }).returning())[0];
      const [credential] = await db.select({ userId: passwordCredentials.userId }).from(passwordCredentials).where(eq(passwordCredentials.userId, user.id)).limit(1);
      if (!credential) await db.insert(passwordCredentials).values({ userId: user.id, passwordHash: await hashPassword(password) });
      await db.insert(personalSpaces).values({ id: crypto.randomUUID(), ownerUserId: user.id }).onConflictDoNothing();
    });
    console.log(`Usuário inicial disponível: ${email}`);
  } finally {
    await pool.end();
  }
}

void main();
