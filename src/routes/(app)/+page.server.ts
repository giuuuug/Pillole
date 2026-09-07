import { z } from 'zod';
import { CATEGORY_IDS } from '$lib/domain/categories';
import { getFeed } from '$lib/server/services/pill-service';
import { getSuggestedUsers } from '$lib/server/services/social-service';
import type { PageServerLoad } from './$types';

const FEED_PAGE = 12;

const paramsSchema = z.object({
	scope: z.enum(['all', 'following']).catch('all'),
	categoria: z
		.enum(CATEGORY_IDS as [string, ...string[]])
		.optional()
		.catch(undefined)
});

export const load: PageServerLoad = async ({ url, locals, setHeaders }) => {
	const { scope, categoria } = paramsSchema.parse({
		scope: url.searchParams.get('scope') ?? 'all',
		categoria: url.searchParams.get('categoria') ?? undefined
	});

	const viewerId = locals.user?.id ?? null;

	// I suggerimenti servono solo per il feed "Seguiti" vuoto: non li
	// calcoliamo se non possono comparire.
	const [feed, suggested] = await Promise.all([
		getFeed({ viewerId, scope, categoryId: categoria, limit: FEED_PAGE }),
		viewerId && scope === 'following' ? getSuggestedUsers(viewerId, 5) : Promise.resolve([])
	]);

	// `no-store`: il feed mostra `isSaved`/`isFollowedByViewer` per viewer,
	// una cache anche breve del browser mostrerebbe stato di segui/salva
	// non aggiornato dopo un'azione fatta altrove.
	setHeaders({ 'cache-control': 'private, no-store' });

	return { feed, suggested, scope, categoria: categoria ?? null };
};
