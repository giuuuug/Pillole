import { redirect } from '@sveltejs/kit';
import type { AppUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	if (!locals.user) {
		redirect(303, `/accedi?next=${encodeURIComponent(url.pathname)}`);
	}

	const me = locals.user as AppUser;

	setHeaders({ 'cache-control': 'private, no-store' });

	return {
		profile: {
			firstName: me.firstName ?? '',
			lastName: me.lastName ?? '',
			username: me.username ?? '',
			birthDate: me.birthDate ?? '',
			bio: me.bio ?? ''
		}
	};
};
