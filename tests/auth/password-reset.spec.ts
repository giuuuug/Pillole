import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';
import { mailMark, waitForLink } from '../support/mail';

test.describe('Password dimenticata / reset', () => {
	test('richiedere il reset per una email esistente produce un link valido', async () => {
		const { user, api } = await registerUser();
		const mark = mailMark();

		const res = await api.requestPasswordReset(user.email);
		expect(res.status).toBe(200);

		const link = await waitForLink(/http:\/\/[^\s]+\/reset-password\/[^\s]+/, mark);
		expect(link).toContain('/reset-password/');
	});

	test('richiedere il reset per una email inesistente risponde comunque 200 (no enumerazione)', async () => {
		const api = newClient();
		const res = await api.requestPasswordReset('nessuno.qui@example.invalid');
		expect(res.status).toBe(200);
	});

	test('un token di reset valido permette di impostare una nuova password, che poi funziona', async () => {
		const { user, api } = await registerUser();
		const mark = mailMark();
		await api.requestPasswordReset(user.email);

		const link = await waitForLink(/http:\/\/[^\s]+\/reset-password\/([^\s?]+)/, mark);
		const token = new URL(link).pathname.split('/').pop()!;

		const newPassword = `${user.password}-nuova`;
		const resetRes = await api.resetPassword(token, newPassword);
		expect(resetRes.status).toBe(200);

		const freshClient = newClient(user.sourceIp);
		const loginOld = await freshClient.signInEmail(user.email, user.password);
		expect(loginOld.ok).toBe(false);

		const loginNew = await newClient(user.sourceIp).signInEmail(user.email, newPassword);
		expect(loginNew.status).toBe(200);
	});

	test('un token di reset non valido viene rifiutato', async () => {
		const api = newClient();
		const res = await api.resetPassword('token-non-valido-e-inventato', 'Qualunque-Password-9');
		expect(res.ok).toBe(false);
	});

	test('un token di reset è utilizzabile una sola volta', async () => {
		const { user, api } = await registerUser();
		const mark = mailMark();
		await api.requestPasswordReset(user.email);
		const link = await waitForLink(/http:\/\/[^\s]+\/reset-password\/([^\s?]+)/, mark);
		const token = new URL(link).pathname.split('/').pop()!;

		const first = await api.resetPassword(token, `${user.password}-1`);
		expect(first.status).toBe(200);

		const second = await newClient(user.sourceIp).resetPassword(token, `${user.password}-2`);
		expect(second.ok, 'lo stesso token di reset non deve poter essere riusato').toBe(false);
	});

	test('resettare la password chiude le altre sessioni attive', async () => {
		const { user, api: deviceA } = await registerUser();
		await deviceA.signInEmail(user.email, user.password);

		const deviceB = newClient(user.sourceIp);
		await deviceB.signInEmail(user.email, user.password);
		const beforeB = await deviceB.json<{ user: unknown }>(await deviceB.getSession());
		expect(beforeB.user).toBeTruthy();

		const mark = mailMark();
		await deviceA.requestPasswordReset(user.email);
		const link = await waitForLink(/http:\/\/[^\s]+\/reset-password\/([^\s?]+)/, mark);
		const token = new URL(link).pathname.split('/').pop()!;
		await deviceA.resetPassword(token, `${user.password}-cambiata`);

		// `noCookieCache`: la revoca è immediata nel database, ma senza questo
		// una get-session normale continuerebbe a fidarsi del cookie firmato
		// fino a 5 minuti (session.cookieCache in auth.ts) — un compromesso di
		// performance dichiarato, non quello che questo test vuole verificare.
		const afterB = await deviceB.json<{ user: unknown } | null>(
			await deviceB.getSession({ noCookieCache: true })
		);
		expect(
			afterB?.user ?? null,
			"la sessione del 'device B' deve essere stata revocata"
		).toBeNull();
	});
});
