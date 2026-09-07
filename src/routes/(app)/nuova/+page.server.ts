import { redirect } from '@sveltejs/kit';
import { canPublish } from '$lib/server/guards';
import type { AppUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/accedi?next=${encodeURIComponent(url.pathname)}`);
	}

	return { canPublish: canPublish(locals.user as AppUser) };
};
