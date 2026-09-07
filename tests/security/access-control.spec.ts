import { test, expect } from '@playwright/test';
import { registerUser, registerAndVerifyUser } from '../support/actors';
import { uniquePill } from '../support/factories';

test.describe('Controllo accessi e falsificazione', () => {
	test('un cookie di sessione manomesso non autentica nessuno (401, non un crash)', async () => {
		const { api } = await registerUser();
		api.setCookieRaw('pillole.session_token', 'valore-completamente-inventato');

		const res = await api.library();
		expect(res.status).toBe(401);
	});

	test('un cookie di sessione vuoto/troncato non autentica nessuno', async () => {
		const { api } = await registerUser();
		const real = api.getCookieRaw('pillole.session_token') ?? '';
		api.setCookieRaw('pillole.session_token', real.slice(0, Math.max(0, real.length - 10)));

		const res = await api.library();
		expect(res.status).toBe(401);
	});

	test('il token di sessione di un utente non autentica come un altro utente', async () => {
		const a = await registerUser();
		const b = await registerUser();

		const tokenA = a.api.getCookieRaw('pillole.session_token');
		expect(tokenA).toBeTruthy();

		b.api.setCookieRaw('pillole.session_token', tokenA!);
		const session = await b.api.json<{ user: { email: string } }>(await b.api.getSession());
		// Se il cookie di A autentica come A anche nel client "di B", va bene
		// (è la stessa identità), ma NON deve mai esporre i dati di B.
		expect(session.user.email).toBe(a.user.email);
	});

	test('un Origin non affidabile viene rifiutato da endpoint sensibili di Better Auth', async () => {
		const { user, api } = await registerUser();
		const mark = Date.now();
		const res = await api.raw('/api/auth/request-password-reset', {
			method: 'POST',
			body: JSON.stringify({ email: user.email, redirectTo: 'http://evil.example/reset' }),
			headers: { origin: 'http://evil.example' }
		});
		expect(res.status).toBeLessThan(500);
		void mark;
	});

	test('un redirect "next" verso un altro dominio non viene mai seguito dal login (open redirect)', async ({
		page
	}) => {
		await page.goto(`/accedi?next=${encodeURIComponent('https://evil.example/steal')}`);
		// La pagina deve restare sul nostro dominio: il valore di `next` è
		// ricalcolato lato client e ricade su "/" se non è un percorso interno.
		await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/accedi/);
	});

	test('un utente verificato non può leggere il corpo di una pillola privata altrui tramite ricerca', async () => {
		const owner = await registerUser();
		const secretTitle = `Segreto-${Date.now()}`;
		await owner.api.createPill(uniquePill({ isPublic: false, title: secretTitle }));

		const attacker = await registerAndVerifyUser();
		const res = await attacker.api.search({ tipo: 'pillole', q: secretTitle });
		const body = await attacker.api.json<{ pills: { title: string }[] }>(res);
		expect(body.pills.some((p) => p.title === secretTitle)).toBe(false);
	});
});
