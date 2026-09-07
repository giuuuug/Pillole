import { test, expect } from '@playwright/test';
import { registerUser, registerAndVerifyUser, toPath } from '../support/actors';
import { uniquePill } from '../support/factories';
import { mailMark, waitForLink } from '../support/mail';
import { getUserByEmail } from '../support/db';
import { fetchPill } from '../support/sveltekit-data';

test.describe('Verifica email', () => {
	test('un utente non verificato NON può pubblicare: la pillola resta privata (2026-09-08: canPublish richiede di nuovo email verificata, vedi CLAUDE.md)', async () => {
		const { user, api } = await registerUser();
		const res = await api.createPill(uniquePill({ isPublic: true }));
		expect(res.status).toBe(201);

		const body = await api.json<{ id: string; published: boolean; needsVerification: boolean }>(
			res
		);
		expect(body.published).toBe(false);
		expect(body.needsVerification).toBe(true);

		const { pill } = await fetchPill(api, body.id);
		expect(pill!.isPublic).toBe(false);

		void user;
	});

	test("cliccare il link di verifica marca l'email come verificata", async () => {
		const { user, api } = await registerAndVerifyUser();

		const session = await api.json<{ user: { emailVerified: boolean } }>(await api.getSession());
		expect(session.user.emailVerified).toBe(true);

		const row = await getUserByEmail(user.email);
		expect(row!.emailVerified).toBe(true);
	});

	test('dopo la verifica, la pillola pubblicata risulta davvero pubblica', async () => {
		const { api } = await registerAndVerifyUser();
		const res = await api.createPill(uniquePill({ isPublic: true }));
		const body = await api.json<{ id: string; published: boolean }>(res);
		expect(body.published).toBe(true);

		const { pill } = await fetchPill(api, body.id);
		expect(pill!.isPublic).toBe(true);
	});

	test('un token di verifica non valido non manda in errore il server e non verifica nulla', async () => {
		const { user, api } = await registerUser();
		const res = await api.verifyEmail('token-completamente-inventato');
		expect(res.status).toBeLessThan(500);

		const row = await getUserByEmail(user.email);
		expect(row!.emailVerified).toBe(false);
	});

	test('si può richiedere un nuovo invio della email di verifica', async () => {
		const { user, api } = await registerUser();
		const mark = mailMark();

		const res = await api.sendVerificationEmail(user.email);
		expect(res.ok).toBe(true);

		const link = await waitForLink(/http:\/\/[^\s]+\/api\/auth\/verify-email\?token=[^\s]+/, mark);
		const verifyRes = await api.get(toPath(link));
		expect(verifyRes.status).toBeLessThan(400);

		const row = await getUserByEmail(user.email);
		expect(row!.emailVerified).toBe(true);
	});
});
