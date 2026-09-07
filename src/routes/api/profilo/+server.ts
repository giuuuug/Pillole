import { json } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import { profileUpdateSchema } from '$lib/domain/validation';
import { jsonError, rateLimit, readJson, requireUser } from '$lib/server/guards';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/** Aggiorna i campi profilo. L'email si cambia dalle rotte di Better Auth. */
export const PUT: RequestHandler = async (event) => {
	const current = requireUser(event);
	rateLimit(event, { key: 'profile:update', max: 20, windowMs: 3_600_000 });

	const input = await readJson(event, profileUpdateSchema);

	// L'indice unico protegge comunque dalla race condition: questo controllo
	// serve solo a dare un messaggio comprensibile invece di un errore 500.
	const [taken] = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(and(sql`lower(${userTable.username}) = ${input.username}`, ne(userTable.id, current.id)))
		.limit(1);

	if (taken) {
		return jsonError(409, 'Username già in uso', { username: 'Questo username è già preso' });
	}

	try {
		await db
			.update(userTable)
			.set({
				firstName: input.firstName,
				lastName: input.lastName,
				name: `${input.firstName} ${input.lastName}`,
				username: input.username,
				displayUsername: input.username,
				birthDate: input.birthDate,
				bio: input.bio || null,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, current.id));
	} catch {
		return jsonError(409, 'Username già in uso', { username: 'Questo username è già preso' });
	}

	return json({ ok: true });
};
