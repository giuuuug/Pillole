import { z } from 'zod';
import { paginationSchema } from '$lib/domain/validation';
import { CATEGORY_IDS } from '$lib/domain/categories';
import { cachedJson, readQuery } from '$lib/server/guards';
import { getFeed } from '$lib/server/services/pill-service';
import type { RequestHandler } from './$types';

const querySchema = paginationSchema.extend({
	scope: z.enum(['all', 'following']).default('all'),
	categoria: z.enum(CATEGORY_IDS as [string, ...string[]]).optional()
});

/** Pagine successive del feed (scroll infinito). */
export const GET: RequestHandler = async (event) => {
	const { cursor, limit, scope, categoria } = readQuery(event.url, querySchema);

	const page = await getFeed({
		viewerId: event.locals.user?.id ?? null,
		scope,
		categoryId: categoria,
		cursor,
		limit
	});

	// `private`: la risposta contiene `isSaved`, che dipende da chi guarda.
	return cachedJson(page, { seconds: 20, private: true });
};
