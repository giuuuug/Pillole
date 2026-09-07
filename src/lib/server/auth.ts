import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username as usernamePlugin } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { db, schema } from './db';
import { mailTemplate, sendMail } from './email';
import { signUpSchema, usernameSchema } from '$lib/domain/validation';

const appUrl = env.BETTER_AUTH_URL ?? env.PUBLIC_APP_URL ?? 'http://localhost:5173';

/** Provider social configurati solo se le credenziali esistono davvero. */
const socialProviders: Record<string, unknown> = {};

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
	socialProviders.google = {
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET,
		// L'utente sceglie l'account ogni volta: evita login "silenziosi" sbagliati.
		prompt: 'select_account'
	};
}

if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
	socialProviders.apple = {
		clientId: env.APPLE_CLIENT_ID,
		clientSecret: env.APPLE_CLIENT_SECRET,
		appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER
	};
}

export const auth = betterAuth({
	appName: 'Pillole',
	baseURL: appUrl,
	// In build non viene firmato nulla: il segnaposto serve solo perche'
	// SvelteKit importa questo modulo per analizzarlo. A runtime un segreto
	// mancante fa fallire l'avvio, ed e' giusto cosi'.
	secret: env.BETTER_AUTH_SECRET ?? (building ? 'build-time-placeholder-secret' : undefined),
	trustedOrigins: [appUrl],

	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification
		}
	}),

	/* --- OWASP A07: Identification and Authentication Failures --- */
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 10,
		maxPasswordLength: 128,
		// Non blocchiamo il login: l'app resta usabile, ma la pubblicazione
		// sul feed richiede email verificata (vedi pill-service).
		requireEmailVerification: false,
		autoSignIn: true,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			const { html, text } = mailTemplate({
				heading: 'Reimposta la tua password',
				body: 'Abbiamo ricevuto una richiesta di reimpostazione. Il link scade tra un’ora.',
				ctaLabel: 'Scegli una nuova password',
				ctaUrl: url
			});
			await sendMail({ to: user.email, subject: 'Pillole — reimposta la password', html, text });
		}
	},

	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 60 * 60 * 24, // 24h
		sendVerificationEmail: async ({ user, url }) => {
			const { html, text } = mailTemplate({
				heading: 'Conferma la tua email',
				body: 'Un ultimo passo per poter condividere le tue pillole con gli altri.',
				ctaLabel: 'Conferma email',
				ctaUrl: url
			});
			await sendMail({ to: user.email, subject: 'Pillole — conferma la tua email', html, text });
		}
	},

	socialProviders,

	account: {
		accountLinking: {
			// Colleghiamo Google/Apple allo stesso account solo se il provider
			// ha gia' verificato l'email: altrimenti e' un account takeover.
			enabled: true,
			trustedProviders: ['google', 'apple']
		}
	},

	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30 giorni
		updateAge: 60 * 60 * 24, // rinnovo al massimo 1 volta al giorno
		/**
		 * Cache firmata in cookie: la sessione non viene riletta dal DB a ogni
		 * richiesta. Con Netlify DB (cold start lento) questo e' il singolo
		 * risparmio di query piu' grosso dell'app.
		 */
		cookieCache: { enabled: true, maxAge: 5 * 60 }
	},

	user: {
		changeEmail: {
			enabled: true,
			// Senza questo, ogni cambio email richiede sempre di confermare
			// dalla nuova casella — un vicolo cieco per chiunque, dato che la
			// verifica email non funziona senza RESEND_API_KEY (trappola #8).
			// Si applica solo quando l'email ATTUALE non e' verificata: una
			// volta che la verifica funzionera' per davvero, chi ha gia'
			// un'email verificata tornera' a dover confermare quella nuova,
			// comportamento standard di Better Auth.
			updateEmailWithoutVerification: true
		},
		deleteUser: { enabled: true },
		additionalFields: {
			firstName: { type: 'string', required: false, input: true },
			lastName: { type: 'string', required: false, input: true },
			birthDate: { type: 'string', required: false, input: true },
			bio: { type: 'string', required: false, input: true }
		}
	},

	/**
	 * OWASP A04 — Insecure Design.
	 * `signUpSchema` (età minima, nome/cognome, username riservati) è la
	 * validazione condivisa client+server per il form di registrazione — ma
	 * il form chiama questo endpoint direttamente via `authClient.signUp`,
	 * quindi senza questo hook chi chiama l'API a mano bypassa quelle regole
	 * per intero: gli `additionalFields` sopra sono `required:false` e senza
	 * alcuna validazione di dominio.
	 */
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const candidate = user as typeof user & {
						firstName?: string;
						lastName?: string;
						birthDate?: string;
					};

					const domainCheck = signUpSchema
						.pick({ firstName: true, lastName: true, birthDate: true })
						.safeParse({
							firstName: candidate.firstName ?? '',
							lastName: candidate.lastName ?? '',
							birthDate: candidate.birthDate ?? ''
						});
					if (!domainCheck.success) {
						throw new APIError('BAD_REQUEST', {
							message: domainCheck.error.issues[0]?.message ?? 'Dati non validi'
						});
					}

					const usernameCheck = usernameSchema.safeParse(candidate.username ?? '');
					if (!usernameCheck.success) {
						throw new APIError('BAD_REQUEST', {
							message: usernameCheck.error.issues[0]?.message ?? 'Username non valido'
						});
					}
				}
			}
		}
	},

	/* --- OWASP A04/A07: brute force e abusi --- */
	rateLimit: {
		enabled: true,
		window: 60,
		max: 30,
		customRules: {
			'/sign-in/email': { window: 300, max: 5 },
			'/sign-up/email': { window: 3600, max: 5 },
			'/request-password-reset': { window: 3600, max: 5 },
			'/change-password': { window: 3600, max: 5 },
			'/send-verification-email': { window: 3600, max: 5 }
		}
	},

	advanced: {
		/**
		 * Su Netlify l'IP reale del client arriva in `x-nf-client-connection-ip`.
		 * Senza questa riga Better Auth non riesce a identificare il chiamante e
		 * fa cadere TUTTI in un unico bucket condiviso: il rate limit diventa
		 * globale (un solo attaccante puo' bloccare l'accesso a chiunque) invece
		 * che per utente.
		 */
		ipAddress: {
			ipAddressHeaders: ['x-nf-client-connection-ip', 'x-forwarded-for']
		},
		cookiePrefix: 'pillole',
		useSecureCookies: !appUrl.startsWith('http://localhost'),
		defaultCookieAttributes: { sameSite: 'lax', httpOnly: true }
	},

	plugins: [
		usernamePlugin({
			minUsernameLength: 3,
			maxUsernameLength: 24,
			usernameValidator: (value) => /^[a-z0-9._]+$/.test(value.toLowerCase())
		}),
		// Deve restare per ultimo: gestisce il set dei cookie in SvelteKit.
		sveltekitCookies(getRequestEvent)
	]
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
