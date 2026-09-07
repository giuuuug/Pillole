import { test, expect } from '@playwright/test';
import { newClient, registerUser, registerAndVerifyUser } from '../support/actors';
import { uniquePill } from '../support/factories';
import { db } from '../support/db';
import { user as userTable } from '../../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

test.describe('Follow e ricerca', () => {
	test('seguire e smettere di seguire un altro utente', async () => {
		const a = await registerUser();
		const b = await registerUser();

		const followRes = await a.api.follow(b.user.username);
		expect(followRes.status).toBe(200);

		const unfollowRes = await a.api.unfollow(b.user.username);
		expect(unfollowRes.status).toBe(200);
	});

	test('seguire due volte la stessa persona non genera errori (idempotente)', async () => {
		const a = await registerUser();
		const b = await registerUser();

		expect((await a.api.follow(b.user.username)).status).toBe(200);
		expect((await a.api.follow(b.user.username)).status).toBe(200);
	});

	test('non si può seguire se stessi', async () => {
		const a = await registerUser();
		const res = await a.api.follow(a.user.username);
		expect(res.status).toBe(400);
	});

	test('seguire uno username inesistente risponde 404', async () => {
		const a = await registerUser();
		const res = await a.api.follow('utente-che-non-esiste-di-sicuro');
		expect(res.status).toBe(404);
	});

	test('senza sessione risponde 401', async () => {
		const anon = newClient();
		const res = await anon.follow('chiunque');
		expect(res.status).toBe(401);
	});

	test('chi non ha ancora scelto uno username non può seguire (409)', async () => {
		// Scenario raggiungibile in produzione solo via login social (audit §7 #4),
		// che qui non è configurabile senza credenziali OAuth reali: lo stato
		// precondizione viene simulato scrivendo direttamente il record —
		// l'azione sotto test (la chiamata a /follow) resta comunque reale.
		const { user, api } = await registerUser();
		await db
			.update(userTable)
			.set({ username: null, displayUsername: null })
			.where(eq(userTable.email, user.email));

		// La sessione già aperta ha il vecchio username nella cache del cookie
		// (session.cookieCache, fino a 5 minuti — vedi auth.ts): un login fresco
		// rilegge lo stato vero dal database, come farebbe un dispositivo nuovo.
		await api.signOut();
		await api.signInEmail(user.email, user.password);

		const other = await registerUser();
		const res = await api.follow(other.user.username);
		expect(res.status).toBe(409);
	});

	test('la ricerca utenti trova per prefisso di username e conta le pillole pubbliche', async () => {
		const { user, api } = await registerAndVerifyUser();
		await api.createPill(uniquePill({ isPublic: true }));

		// Un prefisso corto (es. i primi 8 caratteri) è condiviso da tutti gli
		// utenti generati in questa run (stesso "test_u_" + inizio timestamp) e
		// il risultato è limitato a 15: qui serve un prefisso abbastanza lungo
		// da includere la parte casuale dello username e restare univoco.
		const prefix = user.username.slice(0, user.username.length - 4);
		const res = await newClient().search({ tipo: 'persone', q: prefix });
		expect(res.status).toBe(200);
		const body = await res.json();
		const found = body.users.find((u: { username: string }) => u.username === user.username);
		expect(found, 'utente non trovato nei risultati').toBeTruthy();
		// Bug reale trovato il 2026-09-07: la subquery correlata del conteggio
		// non qualificava "user.id", che risolveva alla "pill.id" locale della
		// subquery — il conteggio era sempre 0. Vedi CLAUDE.md trappola #15.
		expect(found.pillCount).toBe(1);
	});

	test('la ricerca pillole trova per testo nel titolo (full-text)', async () => {
		const author = await registerAndVerifyUser();
		const marker = `Parolachiavissima${Date.now()}`;
		await author.api.createPill(uniquePill({ isPublic: true, title: `Pillola su ${marker}` }));

		const res = await newClient().search({ tipo: 'pillole', q: marker });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.pills.length).toBeGreaterThan(0);
	});

	test('il feed "seguiti" mostra solo le pillole pubbliche di chi si segue', async () => {
		const followed = await registerAndVerifyUser();
		const notFollowed = await registerAndVerifyUser();
		const viewer = await registerUser();

		const followedPill = await followed.api.json<{ id: string }>(
			await followed.api.createPill(uniquePill({ isPublic: true }))
		);
		const notFollowedPill = await notFollowed.api.json<{ id: string }>(
			await notFollowed.api.createPill(uniquePill({ isPublic: true }))
		);

		await viewer.api.follow(followed.user.username);

		const feed = await viewer.api.json<{ items: { id: string }[] }>(
			await viewer.api.feed({ scope: 'following' })
		);
		expect(feed.items.some((p) => p.id === followedPill.id)).toBe(true);
		expect(feed.items.some((p) => p.id === notFollowedPill.id)).toBe(false);
	});

	test('il feed pubblico funziona anche senza sessione e mostra solo pillole pubbliche', async () => {
		const author = await registerUser();
		const priv = await author.api.json<{ id: string }>(
			await author.api.createPill(uniquePill({ isPublic: false }))
		);

		const res = await newClient().feed({ scope: 'all' });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items.some((p: { id: string }) => p.id === priv.id)).toBe(false);
	});
});
