import { AsyncLocalStorage } from 'node:async_hooks';
import type { Database } from '.';
import type { personalSpaces, users } from './schema';
export type PersonalContext = { db: Database; user: typeof users.$inferSelect; space: typeof personalSpaces.$inferSelect };
const identity = new AsyncLocalStorage<PersonalContext>();
export function withPersonalContext<T>(context: PersonalContext, operation: () => Promise<T>) { return identity.run(context, operation); }
export async function ensurePersonalContext(): Promise<PersonalContext | null> { return identity.getStore() ?? null; }
