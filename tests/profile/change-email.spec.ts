import { test, expect } from '@playwright/test';
import { newClient, registerAndVerifyUser, toPath } from '../support/actors';
import { uniqueUser, uniquePill } from '../support/factories';
import { mailMark, waitForLink } from '../support/mail';
import { getUserByEmail } from '../support/db';
import { fetchPill } from '../support/sveltekit-data';

test.describe('Cambio email', () => {
	test('richiedere il cambio non modifica subito la sessione: serve confermare dalla nuova casella', async () => {
		const { user, api } = await registerAndVerifyUser();
		const newEmail = uniqueUser('newmail').email;

		const res = await api.changeEmail(newEmail);
		expect(res.status).toBe(200);

		const session = await api.json<{ user: { email: string } }>(await api.getSession());
		expect(session.user.email).toBe(user.email);

		const row = await getUserByEmail(user.email);
		expect(row).not.toBeNull();
	});

	test("confermare il link mandato alla nuova email aggiorna davvero l'account", async () => {
		const { user, api } = await registerAndVerifyUser();
		const newEmail = uniqueUser('confirmed').email;
		const mark = mailMark();

		await api.changeEmail(newEmail);
		const link = await waitForLink(/http:\/\/[^\s]+\/api\/auth\/verify-email\?token=[^\s]+/, mark);
		const confirmRes = await api.get(toPath(link));
		expect(confirmRes.status).toBeLessThan(400);

		const session = await api.json<{ user: { email: string; emailVerified: boolean } }>(
			await api.getSession()
		);
		expect(session.user.email).toBe(newEmail);
		expect(session.user.emailVerified).toBe(true);

		expect(await getUserByEmail(user.email)).toBeNull();
		expect(await getUserByEmail(newEmail)).not.toBeNull();
	});

	test('rifiuta il cambio verso la email già attuale', async () => {
		const { user, api } = await registerAndVerifyUser();
		const res = await api.changeEmail(user.email);
		expect(res.ok).toBe(false);
	});

	test('chiedere il cambio verso una email già in uso non rompe nulla e non la assegna', async () => {
		const owner = await registerAndVerifyUser();
		const requester = await registerAndVerifyUser();

		const res = await requester.api.changeEmail(owner.user.email);
		// Better Auth risponde comunque status:true per non rivelare quali email esistono,
		// ma l'email non deve davvero cambiare di proprietario.
		expect(res.status).toBeLessThan(500);

		const ownerRow = await getUserByEmail(owner.user.email);
		expect(ownerRow!.email).toBe(owner.user.email.toLowerCase());

		const requesterSession = await requester.api.json<{ user: { email: string } }>(
			await requester.api.getSession()
		);
		expect(requesterSession.user.email).toBe(requester.user.email);
	});

	test('senza sessione risponde con errore', async () => {
		const api = newClient();
		const res = await api.changeEmail(uniqueUser().email);
		expect(res.ok).toBe(false);
	});

	test('una pillola già pubblica resta pubblica dopo un cambio email completato (verifica audit §7)', async () => {
		const { user, api } = await registerAndVerifyUser();
		const created = await api.json<{ id: string; published: boolean }>(
			await api.createPill(uniquePill({ isPublic: true }))
		);
		expect(created.published).toBe(true);

		const newEmail = uniqueUser('audit7').email;
		const mark = mailMark();
		await api.changeEmail(newEmail);
		const link = await waitForLink(/http:\/\/[^\s]+\/api\/auth\/verify-email\?token=[^\s]+/, mark);
		await api.get(toPath(link));

		const pillAfterChange = await fetchPill(api, created.id);
		expect(pillAfterChange.pill!.isPublic, 'la pillola non deve spubblicarsi da sola').toBe(true);

		// E modificandola dopo il cambio email, resta pubblicabile: l'utente è di nuovo verificato.
		const editRes = await api.updatePill(
			created.id,
			uniquePill({ isPublic: true, title: 'Titolo modificato dopo cambio email' })
		);
		expect(editRes.status).toBe(200);
		const editedBody = await api.json<{ published: boolean }>(editRes);
		expect(editedBody.published).toBe(true);

		void user;
	});
});
