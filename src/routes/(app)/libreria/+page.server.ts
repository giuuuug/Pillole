import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { CATEGORY_IDS } from '$lib/domain/categories';
import { getLibrary, getShelfCounts } from '$lib/server/services/pill-service';
import type { PageServerLoad } from './$types';

const PAGE = 12;

const paramsSchema = z.object({
	filtro: z.enum(['all', 'mine', 'saved', 'favorites']).catch('all'),
	categoria: z
		.enum(CATEGORY_IDS as [string, ...string[]])
		.optional()
		.catch(undefined)
});

export const load: PageServerLoad = async ({ url, locals, setHeaders }) => {
	if (!locals.user) {
		redirect(303, `/accedi?next=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const { filtro, categoria } = paramsSchema.parse({
		filtro: url.searchParams.get('filtro') ?? 'all',
		categoria: url.searchParams.get('categoria') ?? undefined
	});

	// Due query in parallelo: il conteggio degli scaffali non deve
	// aspettare l'elenco delle pillole.
	const [library, shelfCounts] = await Promise.all([
		getLibrary({ viewerId: locals.user.id, filter: filtro, categoryId: categoria, limit: PAGE }),
		getShelfCounts(locals.user.id)
	]);

	// `private`: contenuti dell'utente, mai in una cache condivisa.
	setHeaders({ 'cache-control': 'private, no-store' });

	return { library, shelfCounts, filtro, categoria: categoria ?? null };
};
