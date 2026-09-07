import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { avatarUpdateSchema } from '$lib/domain/validation';
import { readJson, requireUser } from '$lib/server/guards';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/** Sceglie uno degli avatar preimpostati (o torna alle iniziali con `null`). */
export const PUT: RequestHandler = async (event) => {
	const current = requireUser(event);
	const input = await readJson(event, avatarUpdateSchema);

	await db
		.update(userTable)
		.set({ image: input.image, updatedAt: new Date() })
		.where(eq(userTable.id, current.id));

	return json({ ok: true });
};
