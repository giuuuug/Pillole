import { getPublicPillsByAuthor } from '$lib/server/services/pill-service';
import { getProfileByUsername } from '$lib/server/services/social-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	const viewerId = locals.user?.id ?? null;

	const profile = await getProfileByUsername(params.username, viewerId);
	const pills = await getPublicPillsByAuthor({
		authorId: profile.id,
		viewerId,
		limit: 12
	});

	// `no-store`: la pagina mostra `isFollowedByViewer` per viewer, una
	// cache del browser mostrerebbe stato di segui non aggiornato.
	setHeaders({ 'cache-control': 'private, no-store' });

	return { profile, pills };
};
