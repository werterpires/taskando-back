import { BadRequestException, ConflictException, Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { getDb, transaction } from '../db';
import { googleIdentities, oauthAttempts, passwordCredentials, personalSpaces, sessions, users } from '../db/schema';
import { hashPassword, isValidDisplayName, isValidEmail, isValidPassword, normalizeEmail, verifyPassword } from './password';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const appOrigin = () => new URL(process.env.APP_ORIGIN ?? 'http://localhost:4200').origin;
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' });
@Injectable()
export class AuthService {
  private async createSession(userId: string) {
    const db = await getDb();
    const token = randomToken();
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
    await db.insert(sessions).values({ tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString() });
    return token;
  }
  async createUser(input: { displayName?: unknown; email?: unknown; password?: unknown }) {
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim().replace(/\s+/g, ' ') : '';
    const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!isValidDisplayName(displayName)) throw new BadRequestException('Informe um nome de 2 a 80 caracteres.');
    if (!isValidEmail(email)) throw new BadRequestException('Informe um e-mail válido.');
    if (!isValidPassword(password)) throw new BadRequestException('A senha deve ter entre 8 e 128 caracteres.');
    return transaction(async () => {
      const db = await getDb();
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) throw new ConflictException('Já existe uma conta com este e-mail.');
      const [user] = await db.insert(users).values({ id: crypto.randomUUID(), email, displayName }).returning();
      await db.insert(passwordCredentials).values({ userId: user.id, passwordHash: await hashPassword(password) });
      const [space] = await db.insert(personalSpaces).values({ id: crypto.randomUUID(), ownerUserId: user.id }).returning();
      return { user, space };
    });
  }
  async login(input: { email?: unknown; password?: unknown }) {
    const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!isValidEmail(email) || !isValidPassword(password)) throw new UnauthorizedException('E-mail ou senha inválidos.');
    const db = await getDb();
    const [account] = await db.select({ user: users, passwordHash: passwordCredentials.passwordHash }).from(users).innerJoin(passwordCredentials, eq(passwordCredentials.userId, users.id)).where(eq(users.email, email)).limit(1);
    if (!account || !await verifyPassword(password, account.passwordHash)) {
      if (!account) await hashPassword(password);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    const [space] = await db.select().from(personalSpaces).where(eq(personalSpaces.ownerUserId, account.user.id)).limit(1);
    return { token: await this.createSession(account.user.id), user: account.user, space };
  }
  async changePassword(userId: string, currentSessionToken: string, input: { currentPassword?: unknown; newPassword?: unknown }) {
    const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : '';
    const newPassword = typeof input.newPassword === 'string' ? input.newPassword : '';
    if (!isValidPassword(newPassword)) throw new BadRequestException('A nova senha deve ter entre 8 e 128 caracteres.');
    if (currentPassword === newPassword) throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    return transaction(async () => {
      const db = await getDb();
      const [credential] = await db.select().from(passwordCredentials).where(eq(passwordCredentials.userId, userId)).limit(1);
      if (!credential || !isValidPassword(currentPassword) || !await verifyPassword(currentPassword, credential.passwordHash)) throw new UnauthorizedException('A senha atual está incorreta.');
      await db.update(passwordCredentials).set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date().toISOString() }).where(eq(passwordCredentials.userId, userId));
      await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, digest(currentSessionToken))));
    });
  }
  private client() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) throw new ServiceUnavailableException('Configure o login Google nas variáveis de ambiente.');
    return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  }
  async begin() {
    const client = this.client();
    const state = randomToken(), nonce = randomToken(), verifier = randomToken();
    const db = await getDb();
    await db.delete(oauthAttempts).where(lt(oauthAttempts.expiresAt, new Date().toISOString()));
    await db.insert(oauthAttempts).values({ stateHash: digest(state), nonce, verifier, expiresAt: new Date(Date.now() + 600_000).toISOString() });
    const url = client.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: CodeChallengeMethod.S256 });
    return { state, url };
  }
  async finish(code: string, state: string, cookieState: string) {
    if (!code || !state || !cookieState || digest(state) !== digest(cookieState)) throw new UnauthorizedException('Login expirado ou inválido.');
    const db = await getDb();
    const [attempt] = await db.delete(oauthAttempts).where(and(eq(oauthAttempts.stateHash, digest(state)), gt(oauthAttempts.expiresAt, new Date().toISOString()))).returning();
    if (!attempt) throw new UnauthorizedException('Login expirado ou já utilizado.');
    const client = this.client();
    const { tokens } = await client.getToken({ code, codeVerifier: attempt.verifier });
    if (!tokens.id_token) throw new UnauthorizedException();
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email_verified || !payload.email || (payload as unknown as { nonce: string }).nonce !== attempt.nonce) throw new UnauthorizedException('Identidade Google não verificada.');
    return transaction(async () => {
      const db = await getDb();
      const [identity] = await db.select().from(googleIdentities).where(eq(googleIdentities.subject, payload.sub));
      let userId = identity?.userId;
      if (!userId) {
        const email = payload.email!.trim().toLowerCase();
        const [user] = await db.insert(users).values({ id: crypto.randomUUID(), email, displayName: payload.name || email }).onConflictDoUpdate({ target: users.email, set: { displayName: payload.name || email, updatedAt: new Date().toISOString() } }).returning();
        userId = user.id;
        const [linked] = await db.select().from(googleIdentities).where(eq(googleIdentities.userId, userId));
        if (linked && linked.subject !== payload.sub) throw new UnauthorizedException('Esta conta já possui outra identidade Google.');
        await db.insert(googleIdentities).values({ subject: payload.sub, userId }).onConflictDoNothing();
      }
      await db.insert(personalSpaces).values({ id: crypto.randomUUID(), ownerUserId: userId }).onConflictDoNothing();
      return this.createSession(userId);
    });
  }
  async context(token?: string) {
    if (!token || token.length > 128) return null;
    const db = await getDb();
    const [result] = await db.select({ user: users, space: personalSpaces }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).innerJoin(personalSpaces, eq(personalSpaces.ownerUserId, users.id)).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date().toISOString())));
    return result ? { db, ...result } : null;
  }
  async logout(token?: string) { if (token) await (await getDb()).delete(sessions).where(eq(sessions.tokenHash, digest(token))); }
}
