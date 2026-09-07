import { json } from '@sveltejs/kit';
import { rateLimit, requireUsername } from '$lib/server/guards';
import { followUser, unfollowUser } from '$lib/server/services/social-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const user = requireUsername(event);
	// Limite anti follow-spam: 100 azioni all'ora sono tante per una persona,
	// pochissime per uno script.
	rateLimit(event, { key: 'follow', max: 100, windowMs: 3_600_000 });

	await followUser(user.id, event.params.username);
	return json({ following: true });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUsername(event);
	await unfollowUser(user.id, event.params.username);
	return json({ following: false });
};
