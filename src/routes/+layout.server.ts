import type { LayoutServerLoad } from './$types';

/**
 * L'unico punto in cui l'utente viene esposto al client.
 * Whitelist esplicita dei campi: email e data di nascita non escono di qui
 * verso pagine che non ne hanno bisogno (OWASP A01 / A02).
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null };

	const u = locals.user as typeof locals.user & { username?: string | null };

	return {
		user: {
			id: u.id,
			name: u.name,
			username: u.username ?? null,
			email: u.email,
			image: u.image ?? null,
			emailVerified: u.emailVerified
		}
	};
};
