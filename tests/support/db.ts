import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';
import { loadAndVerifyTestEnv } from './env';
import * as schema from '../../src/lib/server/db/schema';

/**
 * Accesso diretto al database di TEST, usato solo per:
 *  - pulizia dei dati creati dalla suite (mai per pilotare la logica sotto test);
 *  - asserzioni su invarianti che l'API non espone direttamente (es. verificare
 *    che una riga esista/non esista davvero, non solo che la risposta HTTP lo dica).
 * La logica applicativa viene sempre esercitata via HTTP: questo file non
 * sostituisce mai una chiamata reale all'app.
 */

const env = loadAndVerifyTestEnv();
const sqlClient = neon(env.databaseUrl);
export const db = drizzle(sqlClient, { schema, casing: 'snake_case' });

export async function getUserByEmail(email: string) {
	const [row] = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.email, email.toLowerCase()));
	return row ?? null;
}

export async function getUserByUsername(username: string) {
	const [row] = await db
		.select()
		.from(schema.user)
		.where(sql`lower(${schema.user.username}) = lower(${username})`);
	return row ?? null;
}

export async function getPillById(id: string) {
	const [row] = await db.select().from(schema.pill).where(eq(schema.pill.id, id));
	return row ?? null;
}

/** Rimuove tutti gli utenti creati dai test (email @example.invalid) e tutto ciò che referenzia via cascade. */
export async function cleanupTestData(): Promise<number> {
	const deleted = await db
		.delete(schema.user)
		.where(sql`${schema.user.email} like '%@example.invalid'`)
		.returning({ id: schema.user.id });
	return deleted.length;
}

export async function countUsersByEmailDomain(): Promise<number> {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(schema.user)
		.where(sql`${schema.user.email} like '%@example.invalid'`);
	return row?.n ?? 0;
}
