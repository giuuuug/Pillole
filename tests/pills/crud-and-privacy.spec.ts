import { test, expect } from '@playwright/test';
import { newClient, registerUser, registerAndVerifyUser } from '../support/actors';
import { uniquePill } from '../support/factories';
import { fetchPill } from '../support/sveltekit-data';

test.describe('Pillole — CRUD e privacy', () => {
	test('una pillola nasce privata anche se non lo si specifica esplicitamente', async () => {
		const { api } = await registerUser();
		const input = uniquePill();
		delete (input as Record<string, unknown>).isPublic;

		const res = await api.createPill(input);
		expect(res.status).toBe(201);
		const { id } = await api.json<{ id: string }>(res);

		const { pill } = await fetchPill(api, id);
		expect(pill!.isPublic).toBe(false);
	});

	test('il proprietario legge, modifica ed elimina la propria pillola', async () => {
		const { api } = await registerUser();
		const { id } = await api.json<{ id: string }>(await api.createPill(uniquePill()));

		expect((await fetchPill(api, id)).status).toBe(200);

		const update = uniquePill({ title: 'Titolo aggiornato' });
		expect((await api.updatePill(id, update)).status).toBe(200);
		const updated = await fetchPill(api, id);
		expect(updated.pill!.title).toBe('Titolo aggiornato');

		expect((await api.deletePill(id)).status).toBe(204);
		expect((await fetchPill(api, id)).status).toBe(404);
	});

	test('una pillola privata altrui restituisce 404 (non 403) a un altro utente', async () => {
		const owner = await registerUser();
		const { id } = await owner.api.json<{ id: string }>(await owner.api.createPill(uniquePill()));

		const other = await registerUser();
		expect((await fetchPill(other.api, id)).status).toBe(404);
	});

	test('una pillola privata altrui restituisce 404 anche a chi non è loggato', async () => {
		const owner = await registerUser();
		const { id } = await owner.api.json<{ id: string }>(await owner.api.createPill(uniquePill()));

		const anon = newClient();
		expect((await fetchPill(anon, id)).status).toBe(404);
	});

	test('un altro utente non può modificare né eliminare una pillola non sua (404, non 403)', async () => {
		const owner = await registerUser();
		const { id } = await owner.api.json<{ id: string }>(await owner.api.createPill(uniquePill()));

		const attacker = await registerUser();
		const updateRes = await attacker.api.updatePill(
			id,
			uniquePill({ title: 'Preso il controllo' })
		);
		expect(updateRes.status).toBe(404);

		const deleteRes = await attacker.api.deletePill(id);
		expect(deleteRes.status).toBe(404);

		// La pillola dell'owner non deve essere stata toccata.
		const stillThere = await fetchPill(owner.api, id);
		expect(stillThere.pill!.title).not.toBe('Preso il controllo');
	});

	test('senza sessione, creare/modificare/eliminare risponde 401', async () => {
		const anon = newClient();
		expect((await anon.createPill(uniquePill())).status).toBe(401);
		expect((await anon.updatePill('id-qualsiasi', uniquePill())).status).toBe(401);
		expect((await anon.deletePill('id-qualsiasi')).status).toBe(401);
	});

	test('una pillola pubblica è visibile a chiunque, anche senza sessione', async () => {
		const { api } = await registerAndVerifyUser();
		const { id } = await api.json<{ id: string }>(
			await api.createPill(uniquePill({ isPublic: true }))
		);

		const anon = newClient();
		expect((await fetchPill(anon, id)).status).toBe(200);
	});

	test('rifiuta un titolo troppo corto', async () => {
		const { api } = await registerUser();
		const res = await api.createPill(uniquePill({ title: 'ab' }));
		expect(res.status).toBe(422);
	});

	test('rifiuta una categoria che non esiste', async () => {
		const { api } = await registerUser();
		const res = await api.createPill(uniquePill({ categoryId: 'categoria-inventata' }));
		expect(res.status).toBe(422);
	});

	test('rifiuta un corpo vuoto o troppo corto', async () => {
		const { api } = await registerUser();
		const res = await api.createPill(uniquePill({ body: 'corto' }));
		expect(res.status).toBe(422);
	});

	test('un ID pillola inesistente restituisce 404, non un errore 500', async () => {
		const { api } = await registerUser();
		const res = await fetchPill(api, 'id-che-non-esiste-affatto');
		expect(res.status).toBe(404);
	});

	// --- Regressione: audit §7 #1 — una pillola resa privata deve sparire
	// anche da chi l'aveva salvata (titolo/anteprima inclusi), non solo dal
	// suo dettaglio.
	test("una pillola resa privata sparisce dalla libreria di chi l'aveva salvata", async () => {
		const author = await registerAndVerifyUser();
		const saver = await registerUser();

		const { id } = await author.api.json<{ id: string }>(
			await author.api.createPill(
				uniquePill({ isPublic: true, title: 'Pillola che verrà nascosta' })
			)
		);
		expect((await saver.api.savePill(id)).status).toBe(200);

		let library = await saver.api.json<{ items: { id: string }[] }>(
			await saver.api.library({ filtro: 'saved' })
		);
		expect(library.items.some((p) => p.id === id)).toBe(true);

		const unpublishRes = await author.api.updatePill(
			id,
			uniquePill({ isPublic: false, title: 'Pillola nascosta' })
		);
		expect(unpublishRes.status).toBe(200);

		library = await saver.api.json<{ items: { id: string }[] }>(
			await saver.api.library({ filtro: 'saved' })
		);
		expect(
			library.items.some((p) => p.id === id),
			"la pillola resa privata non deve più comparire, nemmeno con titolo/anteprima, nella libreria di chi l'aveva salvata"
		).toBe(false);

		library = await saver.api.json<{ items: { id: string }[] }>(
			await saver.api.library({ filtro: 'all' })
		);
		expect(library.items.some((p) => p.id === id)).toBe(false);

		// E il dettaglio, se qualcuno avesse ancora il link, resta 404.
		expect((await fetchPill(saver.api, id)).status).toBe(404);
	});
});
