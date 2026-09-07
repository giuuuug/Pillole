import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';

test.describe('Login e logout', () => {
	test('login con email e password corrette apre una sessione', async () => {
		const { user } = await registerUser();
		const api = newClient(user.sourceIp);

		const res = await api.signInEmail(user.email, user.password);
		expect(res.status).toBe(200);

		const session = await api.json<{ user: { email: string } }>(await api.getSession());
		expect(session.user.email).toBe(user.email);
	});

	test('login con username e password corrette apre una sessione', async () => {
		const { user } = await registerUser();
		const api = newClient(user.sourceIp);

		const res = await api.signInUsername(user.username, user.password);
		expect(res.status).toBe(200);
	});

	test('password sbagliata viene rifiutata', async () => {
		const { user } = await registerUser();
		const api = newClient(user.sourceIp);

		const res = await api.signInEmail(user.email, 'Password-Sbagliata-9');
		expect(res.ok).toBe(false);

		const session = await api.json<{ user: unknown } | null>(await api.getSession());
		expect(session?.user ?? null).toBeNull();
	});

	test('email inesistente e password sbagliata restituiscono lo stesso esito (no enumerazione)', async () => {
		const { user } = await registerUser();
		const apiWrongPwd = newClient(user.sourceIp);
		const apiNoSuchUser = newClient(user.sourceIp);

		const wrongPwd = await apiWrongPwd.signInEmail(user.email, 'Password-Sbagliata-9');
		const noSuchUser = await apiNoSuchUser.signInEmail(
			'nessuno.qui@example.invalid',
			'Password-Qualunque-9'
		);

		expect(wrongPwd.status).toBe(noSuchUser.status);
	});

	test('logout invalida la sessione: get-session torna vuota e le rotte protette rispondono 401', async () => {
		const { user } = await registerUser();
		const api = newClient(user.sourceIp);
		await api.signInEmail(user.email, user.password);

		const before = await api.json<{ user: unknown }>(await api.getSession());
		expect(before.user).toBeTruthy();

		const signOutRes = await api.signOut();
		expect(signOutRes.ok).toBe(true);

		const after = await api.json<{ user: unknown } | null>(await api.getSession());
		expect(after?.user ?? null).toBeNull();

		const libreria = await api.library();
		expect(libreria.status).toBe(401);
	});

	test('senza alcuna sessione, le rotte che richiedono login rispondono 401 e non 500', async () => {
		const api = newClient();
		const res = await api.library();
		expect(res.status).toBe(401);
	});

	test('il cookie di sessione è httpOnly e usa il prefisso "pillole"', async () => {
		const { user } = await registerUser();
		const api = newClient(user.sourceIp);
		const res = await api.signInEmail(user.email, user.password);

		const setCookie =
			(res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
		const sessionCookie = setCookie.find((c) => c.toLowerCase().includes('session_token'));
		expect(sessionCookie, `Set-Cookie ricevuti: ${setCookie.join(' | ')}`).toBeTruthy();
		expect(sessionCookie!.toLowerCase()).toContain('httponly');
		expect(sessionCookie!.toLowerCase()).toContain('samesite=lax');
		expect(sessionCookie!).toMatch(/^pillole/);
	});
});
