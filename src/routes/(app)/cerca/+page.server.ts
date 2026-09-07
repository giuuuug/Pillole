import { z } from 'zod';
import { searchPills } from '$lib/server/services/pill-service';
import { searchUsers } from '$lib/server/services/social-service';
import type { PageServerLoad } from './$types';

const paramsSchema = z.object({
	q: z.string().trim().max(80).catch(''),
	tipo: z.enum(['pillole', 'persone']).catch('pillole')
});

export const load: PageServerLoad = async ({ url, locals, setHeaders }) => {
	const { q, tipo } = paramsSchema.parse({
		q: url.searchParams.get('q') ?? '',
		tipo: url.searchParams.get('tipo') ?? 'pillole'
	});

	const viewerId = locals.user?.id ?? null;

	// Nessuna query = nessun lavoro per il database.
	if (!q) return { q, tipo, pills: [], users: [] };

	// `no-store`: i risultati mostrano `isSaved`/`isFollowedByViewer` per
	// viewer, una cache del browser mostrerebbe stato non aggiornato.
	setHeaders({ 'cache-control': 'private, no-store' });

	if (tipo === 'persone') {
		return { q, tipo, pills: [], users: await searchUsers({ q, viewerId, limit: 20 }) };
	}

	return { q, tipo, pills: await searchPills({ q, viewerId, limit: 20 }), users: [] };
};
