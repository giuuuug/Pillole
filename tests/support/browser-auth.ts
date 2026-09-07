import type { BrowserContext } from '@playwright/test';
import type { ApiClient } from './client';
import { loadAndVerifyTestEnv } from './env';

const env = loadAndVerifyTestEnv();

/**
 * Trasferisce la sessione di un ApiClient (già autenticato via HTTP) dentro
 * un vero BrowserContext, cosi' i test che riguardano solo il rendering (es.
 * la modale di eliminazione) non devono rifare login dalla UI ogni volta.
 * I test che riguardano *proprio* login/registrazione usano invece la UI vera.
 */
export async function injectSession(context: BrowserContext, api: ApiClient): Promise<void> {
	const url = new URL(env.baseURL);
	const token = api.getCookieRaw('pillole.session_token');
	if (!token) throw new Error('ApiClient senza sessione: effettua prima il login.');

	await context.addCookies([
		{
			name: 'pillole.session_token',
			value: token,
			domain: url.hostname,
			path: '/',
			httpOnly: true,
			sameSite: 'Lax'
		}
	]);
}
