import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { AppUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	if (!locals.user) {
		redirect(303, `/accedi?next=${encodeURIComponent(url.pathname)}`);
	}

	const me = locals.user as AppUser;

	// Serve a sapere se mostrare "cambia password": chi entra solo con
	// Google o Apple una password non ce l'ha.
	const providers = await db
		.select({ providerId: account.providerId })
		.from(account)
		.where(eq(account.userId, me.id));

	setHeaders({ 'cache-control': 'private, no-store' });

	return {
		email: me.email,
		emailVerified: Boolean(me.emailVerified),
		hasPassword: providers.some((p) => p.providerId === 'credential'),
		linkedProviders: providers.map((p) => p.providerId).filter((p) => p !== 'credential')
	};
};
