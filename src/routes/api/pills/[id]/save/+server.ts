import { json } from '@sveltejs/kit';
import { rateLimit, requireUser } from '$lib/server/guards';
import { savePillToLibrary, unsavePillFromLibrary } from '$lib/server/services/pill-service';
import type { RequestHandler } from './$types';

/** Salva la pillola di qualcun altro nella propria libreria. */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	rateLimit(event, { key: 'pill:save', max: 60, windowMs: 60_000 });

	const saveCount = await savePillToLibrary(event.params.id, user.id);
	return json({ saved: true, saveCount });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const saveCount = await unsavePillFromLibrary(event.params.id, user.id);
	return json({ saved: false, saveCount });
};
