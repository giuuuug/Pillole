import { error, redirect } from '@sveltejs/kit';
import { canPublish } from '$lib/server/guards';
import type { AppUser } from '$lib/server/guards';
import { getPill } from '$lib/server/services/pill-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		redirect(303, `/accedi?next=${encodeURIComponent(url.pathname)}`);
	}

	const pill = await getPill(params.id, locals.user.id);

	// Si modifica solo cio' che si e' scritto.
	if (!pill.isMine) error(403, 'Puoi modificare solo le tue pillole');

	const user = locals.user as AppUser;
	return {
		pill,
		canPublish: canPublish(user),
		hasUsername: Boolean(user.username),
		emailVerified: Boolean(user.emailVerified)
	};
};
