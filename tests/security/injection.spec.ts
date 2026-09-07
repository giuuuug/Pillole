import { test, expect } from '@playwright/test';
import { newClient, registerUser, registerAndVerifyUser } from '../support/actors';
import { uniquePill } from '../support/factories';
import { db } from '../support/db';
import { category as categoryTable } from '../../src/lib/server/db/schema';
import { fetchPill } from '../support/sveltekit-data';

const SQLI_PAYLOADS = [
	`' OR '1'='1`,
	`'; DROP TABLE "pill"; --`,
	`x' UNION SELECT password FROM account --`,
	`admin'--`,
	`\\'; SELECT pg_sleep(0)--`
];

test.describe('Injection', () => {
	for (const payload of SQLI_PAYLOADS) {
		test(`la ricerca pillole con payload SQLi "${payload}" non causa un errore server e non rompe il DB`, async () => {
			const res = await newClient().search({ tipo: 'pillole', q: payload });
			expect(res.status).toBeLessThan(500);
		});

		test(`la ricerca persone con payload SQLi "${payload}" non causa un errore server`, async () => {
			const res = await newClient().search({ tipo: 'persone', q: payload });
			expect(res.status).toBeLessThan(500);
		});

		test(`seguire uno username con payload SQLi "${payload}" non causa un errore server`, async () => {
			const { api } = await registerUser();
			const res = await api.follow(payload);
			expect(res.status).toBeLessThan(500);
			expect([400, 404]).toContain(res.status);
		});
	}

	test('un payload SQLi nel titolo/corpo di una pillola viene salvato come testo letterale', async () => {
		const { api } = await registerUser();
		const payload = `Titolo'); DROP TABLE "category"; --`;
		const res = await api.createPill(uniquePill({ title: payload }));
		expect(res.status).toBe(201);

		const { id } = await api.json<{ id: string }>(res);
		const { pill } = await fetchPill(api, id);
		expect(pill!.title).toBe(payload);

		// Il database non ha subito danni: le categorie di serie esistono ancora.
		const categories = await db.select().from(categoryTable);
		expect(categories.length).toBeGreaterThan(0);
	});

	test('le categorie di serie sopravvivono a tutta la batteria di payload SQLi precedente', async () => {
		const categories = await db.select().from(categoryTable);
		expect(categories.length).toBeGreaterThanOrEqual(15);
	});

	test('campi extra non previsti nel corpo (mass assignment) vengono ignorati, non applicati', async () => {
		const author = await registerAndVerifyUser();
		const victim = await registerUser();

		const payload = {
			...uniquePill(),
			authorId: victim.user.username, // tentativo di intestare la pillola a qualcun altro
			id: 'id-scelto-dall-attaccante',
			saveCount: 999999,
			isFavorite: true
		};

		const res = await author.api.createPill(payload as never);
		expect(res.status).toBe(201);
		const { id } = await author.api.json<{ id: string }>(res);

		expect(id).not.toBe('id-scelto-dall-attaccante');

		const { pill } = await fetchPill(author.api, id);
		expect(pill!.isMine).toBe(true); // resta dell'autore reale, non della vittima
		expect(pill!.saveCount).toBe(0);
		expect(pill!.isFavorite).toBe(false);
	});

	test('un array "sources" con URL javascript: viene rifiutato dalla validazione', async () => {
		const { api } = await registerUser();
		const res = await api.createPill(
			uniquePill({ sources: [{ label: 'Fonte malevola', url: 'javascript:alert(1)' }] })
		);
		expect(res.status).toBe(422);
	});
});
