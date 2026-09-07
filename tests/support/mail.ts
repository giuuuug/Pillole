import fs from 'node:fs';
import { loadAndVerifyTestEnv } from './env';

/**
 * "Casella di posta" dei test: senza RESEND_API_KEY, src/lib/server/email.ts
 * logga il link (verifica email / reset password) invece di spedirlo — è il
 * fallback pensato apposta per lo sviluppo locale. I test lo leggono dal file
 * di log del server invece di parlare con un vero provider email: è comunque
 * un comportamento reale dell'app (lo stesso che vedrebbe uno sviluppatore
 * in locale), non uno stub — nessuna chiamata a Better Auth è mockata.
 */

const env = loadAndVerifyTestEnv();

/** Punto nel log da cui iniziare a cercare: da chiamare PRIMA di innescare l'invio. */
export function mailMark(): number {
	try {
		return fs.statSync(env.devServerLogPath).size;
	} catch {
		return 0;
	}
}

export async function waitForLink(
	pattern: RegExp,
	since: number,
	timeoutMs = 10_000
): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const text = readSince(since);
		const match = text.match(pattern);
		if (match) return match[0];
		await new Promise((r) => setTimeout(r, 150));
	}
	throw new Error(
		`Nessun link trovato nel log del server (pattern ${pattern}) entro ${timeoutMs}ms. ` +
			`Controlla ${env.devServerLogPath}.`
	);
}

function readSince(since: number): string {
	const buf = fs.readFileSync(env.devServerLogPath);
	return buf.subarray(since).toString('utf-8');
}

export function extractVerifyUrl(logChunk: string): string {
	const match = logChunk.match(/http:\/\/[^\s]+\/verify-email\?token=[^\s]+/);
	if (!match) throw new Error('Link di verifica email non trovato nel log.');
	return match[0];
}

export function extractResetUrl(logChunk: string): string {
	const match = logChunk.match(/http:\/\/[^\s]+\/reset-password\/[^\s]+/);
	if (!match) throw new Error('Link di reset password non trovato nel log.');
	return match[0];
}
