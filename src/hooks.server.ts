import { svelteKitHandler } from 'better-auth/svelte-kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { building, dev } from '$app/environment';

/**
 * Carica la sessione una sola volta per richiesta e la mette in `locals`.
 * Grazie a `session.cookieCache` questo di norma NON tocca il database.
 */
const handleSession: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	const result = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = result?.user ?? null;
	event.locals.session = result?.session ?? null;

	return resolve(event);
};

/** Gestisce tutte le rotte /api/auth/* di Better Auth. */
const handleAuth: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

/**
 * Header di sicurezza (OWASP A05: Security Misconfiguration).
 * In produzione li aggiunge anche netlify.toml — qui servono in dev
 * e come rete di sicurezza se l'app finisse dietro un altro host.
 */
const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	);
	response.headers.set('X-Frame-Options', 'DENY');
	if (!dev) {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=63072000; includeSubDomains; preload'
		);
	}

	return response;
};

export const handle = sequence(handleSecurityHeaders, handleSession, handleAuth);

/**
 * OWASP A09: logging. Registriamo l'errore reale lato server ma restituiamo
 * all'utente un messaggio generico, senza stack trace ne' dettagli interni.
 */
export const handleError: HandleServerError = ({ error, event, status }) => {
	const id = crypto.randomUUID();

	if (status !== 404) {
		console.error(`[error ${id}] ${event.request.method} ${event.url.pathname}`, error);
	}

	return {
		message:
			status === 404
				? 'Questa pagina non esiste.'
				: 'Qualcosa è andato storto. Riprova tra un momento.',
		code: id
	};
};
