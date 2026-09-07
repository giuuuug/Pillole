import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';
import { uniqueUser, uniquePill } from '../support/factories';

/**
 * Questi test riusano deliberatamente lo STESSO IP simulato per più
 * richieste (a differenza del resto della suite, che ne usa uno diverso per
 * ogni utente apposta per non far scattare i limiti a vicenda): qui è
 * proprio quello il comportamento sotto test.
 */
test.describe('Rate limiting', () => {
	test('dopo 5 tentativi di login sbagliati dallo stesso IP, il 6° viene bloccato (429)', async () => {
		const { user } = await registerUser();
		const sharedIp = '10.99.99.1';

		let last;
		for (let i = 0; i < 6; i++) {
			const api = newClient(sharedIp);
			last = await api.signInEmail(user.email, 'password-sbagliata-di-proposito');
		}
		expect(last!.status).toBe(429);
	});

	test('dopo 5 registrazioni dallo stesso IP, la 6a viene bloccata (429)', async () => {
		const sharedIp = '10.99.99.2';

		let last;
		for (let i = 0; i < 6; i++) {
			const api = newClient(sharedIp);
			last = await api.signUpEmail(uniqueUser('ratelimit'));
		}
		expect(last!.status).toBe(429);
	});

	test('due IP diversi hanno bucket di rate limit indipendenti', async () => {
		const ipA = '10.99.99.3';
		const ipB = '10.99.99.4';

		for (let i = 0; i < 5; i++) {
			await newClient(ipA).signInEmail('inesistente@example.invalid', 'sbagliata');
		}
		const blockedA = await newClient(ipA).signInEmail('inesistente@example.invalid', 'sbagliata');
		expect(blockedA.status).toBe(429);

		const stillOkB = await newClient(ipB).signInEmail('inesistente@example.invalid', 'sbagliata');
		expect(stillOkB.status).not.toBe(429);
	});
});

/**
 * Audit §7 #6 — il limite sulla dimensione del body (guards.ts::readJson) si
 * basa solo sull'header content-length: senza quell'header (encoding
 * "chunked", che qualunque client HTTP può scegliere di usare) il controllo
 * non scatta affatto, e il server legge comunque l'intero payload.
 */
test.describe('Limite dimensione body (audit §7 #6)', () => {
	function oversizedPillPayload() {
		return {
			...uniquePill(),
			// Campo extra, ignorato dalla validazione ma che gonfia comunque il
			// body oltre il limite di 256 KB dichiarato in guards.ts.
			padding: 'z'.repeat(280 * 1024)
		};
	}

	test('un body oltre 256 KB con content-length corretto viene rifiutato subito (413)', async () => {
		const { api } = await registerUser();
		const res = await api.createPill(oversizedPillPayload() as never);
		expect(res.status).toBe(413);
	});

	test('lo stesso body oltre 256 KB, mandato senza content-length (chunked), non viene bloccato dal limite', async () => {
		const { api } = await registerUser();
		const bodyText = JSON.stringify(oversizedPillPayload());

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode(bodyText));
				controller.close();
			}
		});

		// Il server chiude lo stream (e quindi spesso la connessione) appena i
		// byte letti superano il limite (vedi readBodyWithLimit in guards.ts):
		// con un body chunked questo può arrivare come un 413 pulito o come un
		// reset di connessione lato client — in entrambi i casi il payload
		// NON viene accettato, che è la proprietà sotto test.
		let status: number | null = null;
		let connectionWasReset = false;
		try {
			const res = await api.raw('/api/pills', {
				method: 'POST',
				body: stream,
				duplex: 'half',
				headers: { 'content-type': 'application/json' }
			} as RequestInit & { duplex: 'half' });
			status = res.status;
		} catch {
			connectionWasReset = true;
		}

		expect(
			status === 413 || connectionWasReset,
			`un body chunked oltre 256 KB deve essere rifiutato: atteso 413 o un reset di connessione, ricevuto status=${status}`
		).toBe(true);
	});
});
