import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/guards';
import { toggleFavorite } from '$lib/server/services/pill-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const isFavorite = await toggleFavorite(event.params.id, user.id);
	return json({ isFavorite });
};
