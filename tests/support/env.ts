import fs from 'node:fs';
import path from 'node:path';

/**
 * Confine di sicurezza dell'intera suite blackbox.
 *
 * Questo file viene importato sia dal global-setup di Playwright sia da ogni
 * helper che parla col database. Per default, se DATABASE_URL punta allo
 * stesso host del `.env` reale, l'intera suite si rifiuta di partire: i test
 * di sicurezza qui dentro tentano SQL injection, creano decine di utenti
 * usa-e-getta e cercano di rompere il rate limit. Questo blocco può essere
 * disattivato con ALLOW_SAME_DB=true in .env.test — vedi più sotto.
 */

const projectRoot = path.resolve(import.meta.dirname, '..', '..');

function readUrlFromEnvFile(file: string, key: string): string | null {
	const full = path.join(projectRoot, file);
	if (!fs.existsSync(full)) return null;
	const content = fs.readFileSync(full, 'utf-8');
	const line = content.split('\n').find((l) => l.trim().startsWith(`${key}=`));
	if (!line) return null;
	return line
		.split('=')
		.slice(1)
		.join('=')
		.trim()
		.replace(/^["']|["']$/g, '');
}

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

	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL non impostata per i test. Crea .env.test (vedi tests/support/env.ts) e lancia i test con ' +
				'"npm run test:e2e", che carica quel file automaticamente. NON eseguire i test senza un database dedicato.'
		);
	}
	if (!betterAuthSecret) {
		throw new Error('BETTER_AUTH_SECRET non impostata per i test. Vedi .env.test.');
	}

	// .env.test non deve puntare allo STESSO file .env: se non esiste come file
	// a se stante, chi lancia i test sta probabilmente riusando l'ambiente reale.
	if (!fs.existsSync(path.join(projectRoot, '.env.test'))) {
		throw new Error(
			'.env.test non trovato. I test blackbox (incluse le prove di injection e i tentativi di bypass) ' +
				'non devono MAI girare contro il database reale. Crea .env.test con la connection string di un ' +
				"branch Neon dedicato — vedi il README, sezione 'Local vs. production database'."
		);
	}

	const realHost = hostOf(readUrlFromEnvFile('.env', 'DATABASE_URL'));
	const testHost = hostOf(databaseUrl);

	if (realHost && testHost && realHost === testHost) {
		// Blocco di default: i test di sicurezza di questa suite scrivono dati e
		// tentano attacchi reali, quindi normalmente NON devono girare contro lo
		// stesso database di .env. Richiede un opt-in esplicito e consapevole
		// (impostato una volta sola, il 2026-09-04, su richiesta diretta
		// dell'utente: il database in quel momento non aveva ancora utenti reali).
		if (process.env.ALLOW_SAME_DB !== 'true') {
			throw new Error(
				`STOP: DATABASE_URL dei test punta allo stesso host di .env (${testHost}). ` +
					'Per confermare che è una scelta deliberata, imposta ALLOW_SAME_DB=true in .env.test. ' +
					'In alternativa, crea un branch Neon dedicato — vedi il README, sezione ' +
					"'Local vs. production database'."
			);
		}
		console.warn(
			`[tests/env] ATTENZIONE: la suite gira contro lo STESSO database di .env (${testHost}), ` +
				'per scelta esplicita (ALLOW_SAME_DB=true). Tutti i dati creati dai test useranno prefissi ' +
				'univoci ed email @example.invalid, e verranno ripuliti a fine suite con cleanupTestData().'
		);
	}

	if (
		testHost &&
		/\.db\.netlify\.com$/.test(testHost) === false &&
		/neon\.tech$/.test(testHost) === false
	) {
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
