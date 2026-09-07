import fs from 'node:fs';
import path from 'node:path';

/**
 * Confine di sicurezza dell'intera suite blackbox.
 *
 * La suite gira contro lo STESSO `.env` usato da `npm run dev` — non esiste
 * più un file separato per i test (era `.env.test`, rimosso il 2026-09-07,
 * vedi CLAUDE.md). Il file `.env` deve quindi SEMPRE puntare a un database
 * di sviluppo, mai a produzione: i test di sicurezza qui dentro tentano SQL
 * injection, creano decine di utenti usa-e-getta e cercano di rompere il
 * rate limit, e la produzione non serve mai in locale (Netlify inietta le
 * sue variabili da solo). Vedi README, sezione "Environment variables".
 */

const projectRoot = path.resolve(import.meta.dirname, '..', '..');

function hostOf(connectionString: string | null): string | null {
	if (!connectionString) return null;
	try {
		return new URL(connectionString).host;
	} catch {
		return null;
	}
}

export type TestEnv = {
	baseURL: string;
	port: number;
	databaseUrl: string;
	betterAuthSecret: string;
	devServerLogPath: string;
};

export function loadAndVerifyTestEnv(): TestEnv {
	const databaseUrl = process.env.DATABASE_URL;
	const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
	const baseURL =
		process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_APP_URL ?? 'http://localhost:4173';

	if (!fs.existsSync(path.join(projectRoot, '.env'))) {
		throw new Error(
			'.env non trovato. Crea .env (cp .env.example .env) con la connection string di un database ' +
				"di sviluppo — vedi il README, sezione 'Environment variables'. NON esiste più .env.test."
		);
	}
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL non impostata. Aggiungila a .env — vedi il README. NON eseguire i test senza un ' +
				'database dedicato allo sviluppo.'
		);
	}
	if (!betterAuthSecret) {
		throw new Error('BETTER_AUTH_SECRET non impostata. Aggiungila a .env — vedi il README.');
	}

	const testHost = hostOf(databaseUrl);
	if (testHost && /\.db\.netlify\.com$/.test(testHost) === false && /neon\.tech$/.test(testHost) === false) {
		// Non un errore fatale — solo host "non riconosciuti" (es. postgres locale per debug manuale):
		// li lasciamo passare ma è un segnale da controllare a vista se non è quello che ti aspetti.
		console.warn(
			`[tests/env] Host del database di test non riconosciuto come Neon/Netlify DB: ${testHost}`
		);
	}

	return {
		baseURL,
		port: Number(new URL(baseURL).port || 4173),
		databaseUrl,
		betterAuthSecret,
		devServerLogPath: path.join(projectRoot, 'test-results', 'dev-server.log')
	};
}
