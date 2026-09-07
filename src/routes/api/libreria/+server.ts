import { z } from 'zod';
import { paginationSchema } from '$lib/domain/validation';
import { CATEGORY_IDS } from '$lib/domain/categories';
import { cachedJson, readQuery, requireUser } from '$lib/server/guards';
import { getLibrary } from '$lib/server/services/pill-service';
import type { RequestHandler } from './$types';

const querySchema = paginationSchema.extend({
	filtro: z.enum(['all', 'mine', 'saved', 'favorites']).default('all'),
	categoria: z.enum(CATEGORY_IDS as [string, ...string[]]).optional()
});

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const { cursor, limit, filtro, categoria } = readQuery(event.url, querySchema);

	const page = await getLibrary({
		viewerId: user.id,
		filter: filtro,
		categoryId: categoria,
		cursor,
		limit
	});

	return cachedJson(page, { seconds: 10, private: true });
};
