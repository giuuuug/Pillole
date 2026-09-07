import { z } from 'zod';
import { searchQuerySchema } from '$lib/domain/validation';
import { cachedJson, readQuery } from '$lib/server/guards';
import { searchPills } from '$lib/server/services/pill-service';
import { searchUsers } from '$lib/server/services/social-service';
import type { RequestHandler } from './$types';

const querySchema = searchQuerySchema.extend({
	tipo: z.enum(['pillole', 'persone']).default('pillole')
});

/** Ricerca unificata: pillole (full-text) o persone (username / nome). */
export const GET: RequestHandler = async (event) => {
	const { q, limit, tipo } = readQuery(event.url, querySchema);
	const viewerId = event.locals.user?.id ?? null;

	if (tipo === 'persone') {
		const users = await searchUsers({ q, viewerId, limit });
		return cachedJson({ users }, { seconds: 30, private: true });
	}

	const pills = await searchPills({ q, viewerId, limit });
	return cachedJson({ pills }, { seconds: 30, private: true });
};
