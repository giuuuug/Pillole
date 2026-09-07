import { getConnections } from '$lib/server/services/social-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const users = await getConnections({
		username: params.username,
		direction: 'following',
		viewerId: locals.user?.id ?? null,
		limit: 50
	});

	return { users, username: params.username, direction: 'following' as const };
};
