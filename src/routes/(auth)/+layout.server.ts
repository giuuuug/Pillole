import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

/**
 * I pulsanti social compaiono solo se le credenziali esistono davvero:
 * meglio nessun pulsante che un pulsante che porta a una pagina di errore.
 */
export const load: LayoutServerLoad = async () => ({
	providers: {
		google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
		apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET)
	}
});
