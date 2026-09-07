/**
 * Dati usa-e-getta per i test. Le email finiscono sempre in `@example.invalid`
 * (dominio riservato da RFC 2606, non risolvibile): anche se per errore
 * RESEND_API_KEY fosse impostata nell'ambiente di test, nessuna email
 * potrebbe mai raggiungere una persona vera.
 *
 * Playwright ricarica il modulo di ogni file di test da zero (verificato: un
 * contatore module-level riparte da 1 in ogni file, anche con un solo
 * worker) — quindi qualunque contatore che riparta da 0 produrrebbe GLI
 * STESSI valori in file diversi. Per questo qui non si usa un contatore
 * incrementale puro: ogni valore include entropia casuale vera.
 */
import { randomBytes, randomInt } from 'node:crypto';

export function uniqueSuffix(): string {
	return `${Date.now().toString(36)}${randomBytes(5).toString('hex')}`;
}

/**
 * Indirizzo IPv4 privato (10.0.0.0/8) sintetico e univoco per test, usato
 * come `x-forwarded-for`: da' a ogni utente simulato un proprio bucket di
 * rate limit, cosi' un test non ne fa scattare uno per un altro. Vedi
 * ApiClient in client.ts.
 */
export function uniqueIp(): string {
	return `10.${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`;
}

export type TestUserInput = {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	birthDate: string;
	password: string;
	sourceIp: string;
};

export function uniqueUser(prefix = 'u'): TestUserInput {
	const n = uniqueSuffix();
	// Uno username può contenere solo [a-z0-9._] (usernamePlugin in auth.ts):
	// un prefisso con un trattino romperebbe silenziosamente ogni test che lo
	// passa, con un 400 che sembra un bug dell'app invece che dei dati di test.
	const safePrefix = prefix.replace(/[^a-z0-9]/gi, '').toLowerCase();
	return {
		firstName: 'Test',
		lastName: 'Utente',
		username: `test_${safePrefix}_${n}`.toLowerCase().slice(0, 24),
		email: `test.${prefix}.${n}@example.invalid`,
		birthDate: '2000-01-15',
		password: `Correct-Horse-${n}-Battery`,
		sourceIp: uniqueIp()
	};
}

export type TestPillInput = {
	title: string;
	body: string;
	format: 'text' | 'latex';
	categoryId: string;
	sources: { label: string; url?: string }[];
	isPublic: boolean;
};

export function uniquePill(overrides: Partial<TestPillInput> = {}): TestPillInput {
	const n = uniqueSuffix();
	return {
		title: `Pillola di test ${n}`,
		body: `Questo è il corpo della pillola di test numero ${n}. Contiene abbastanza testo per superare la validazione minima.`,
		format: 'text',
		categoryId: 'tech',
		sources: [],
		isPublic: false,
		...overrides
	};
}
