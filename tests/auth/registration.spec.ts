import { test, expect } from '@playwright/test';
import { newClient } from '../support/actors';
import { uniqueUser } from '../support/factories';
import { getUserByEmail, getUserByUsername } from '../support/db';
import { mailMark, waitForLink } from '../support/mail';

test.describe('Registrazione', () => {
	test('un utente valido si registra, riceve una sessione e viene salvato correttamente', async () => {
		const user = uniqueUser('reg');
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);
		expect(res.status).toBe(200);

		// Sessione creata subito (autoSignIn:true).
		const session = await api.json<{ user: { email: string } } | null>(await api.getSession());
		expect(session?.user.email).toBe(user.email);

		const row = await getUserByEmail(user.email);
		expect(row).not.toBeNull();
		expect(row!.username).toBe(user.username);
		expect(row!.firstName).toBe(user.firstName);
		expect(row!.lastName).toBe(user.lastName);
		expect(row!.emailVerified).toBe(false);
	});

	test('rifiuta una seconda registrazione con la stessa email', async () => {
		const user = uniqueUser('dupe-email');
		const api1 = newClient(user.sourceIp);
		expect((await api1.signUpEmail(user)).status).toBe(200);

		const api2 = newClient(uniqueUser().sourceIp);
		const res2 = await api2.signUpEmail({ ...uniqueUser(), email: user.email });
		expect(res2.ok).toBe(false);
	});

	test('rifiuta uno username già preso, anche con maiuscole diverse', async () => {
		const user = uniqueUser('dupe-user');
		const api1 = newClient(user.sourceIp);
		expect((await api1.signUpEmail(user)).status).toBe(200);

		const api2 = newClient(uniqueUser().sourceIp);
		const res2 = await api2.signUpEmail({ ...uniqueUser(), username: user.username.toUpperCase() });
		expect(res2.ok).toBe(false);
	});

	test('rifiuta una password sotto i 10 caratteri', async () => {
		const user = { ...uniqueUser('short-pwd'), password: 'Sh0rt!' };
		const api = newClient(user.sourceIp);
		const res = await api.signUpEmail(user);
		expect(res.ok).toBe(false);
	});

	test('rifiuta una email malformata', async () => {
		const user = { ...uniqueUser('bad-email'), email: 'non-una-email' };
		const api = newClient(user.sourceIp);
		const res = await api.signUpEmail(user);
		expect(res.ok).toBe(false);
	});

	// --- Invarianti di dominio (src/lib/domain/validation.ts) che il form
	// applica lato client ma che devono valere ANCHE se si chiama l'API
	// direttamente: CLAUDE.md le dichiara non negoziabili.

	test('rifiuta la registrazione di un minore di 14 anni anche bypassando il form', async () => {
		const fiveYearsOld = new Date();
		fiveYearsOld.setFullYear(fiveYearsOld.getFullYear() - 5);
		const user = {
			...uniqueUser('under14'),
			birthDate: fiveYearsOld.toISOString().slice(0, 10)
		};
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);

		expect(res.ok, "Un account con meno di 14 anni non deve poter essere creato dall'API").toBe(
			false
		);
		const row = await getUserByEmail(user.email);
		expect(row, "L'utente sotto età non deve restare nel database").toBeNull();
	});

	test('rifiuta una data di nascita nel futuro', async () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const user = { ...uniqueUser('future-dob'), birthDate: future.toISOString().slice(0, 10) };
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);
		expect(res.ok).toBe(false);
	});

	test('rifiuta la registrazione senza nome o cognome, anche bypassando il form', async () => {
		const user = uniqueUser('no-name');
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user, { firstName: '', lastName: '' });
		expect(res.ok, 'Nome e cognome sono richiesti dal dominio (signUpSchema)').toBe(false);
	});

	test('rifiuta uno username riservato (es. "admin"), anche bypassando il form', async () => {
		const user = { ...uniqueUser('reserved'), username: 'admin' };
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);
		expect(
			res.ok,
			'Gli username riservati (RESERVED_USERNAMES) devono valere anche lato server'
		).toBe(false);

		const row = await getUserByUsername('admin');
		expect(row).toBeNull();
	});

	test('rifiuta uno username che non inizia con lettera o numero', async () => {
		const user = { ...uniqueUser('dotstart'), username: `._${uniqueUser().username}`.slice(0, 24) };
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);
		expect(res.ok).toBe(false);
	});

	// --- Injection / XSS nei campi di testo libero ---

	test('accetta caratteri di injection nel nome ma li tratta come testo innocuo', async () => {
		const payload = `Robert'); DROP TABLE "user";--`;
		const user = { ...uniqueUser('sqli'), firstName: payload };
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);
		expect(res.status).toBe(200);

		const row = await getUserByEmail(user.email);
		expect(row).not.toBeNull(); // la tabella user esiste ancora: nessuna injection riuscita
		expect(row!.firstName).toBe(payload); // salvato come stringa letterale, non eseguito

		const stillThere = await getUserByEmail(user.email);
		expect(stillThere).not.toBeNull();
	});

	test('accetta un payload XSS nel nome e lo salva come testo letterale', async () => {
		const payload = `<script>window.__xss=1</script>`;
		const user = { ...uniqueUser('xss'), firstName: payload };
		const api = newClient(user.sourceIp);

		const res = await api.signUpEmail(user);
		expect(res.status).toBe(200);

		const row = await getUserByEmail(user.email);
		expect(row!.firstName).toBe(payload);
	});

	test('manda una email di verifica alla registrazione (log di sviluppo)', async () => {
		const user = uniqueUser('verify-mail');
		const api = newClient(user.sourceIp);
		const mark = mailMark();

		expect((await api.signUpEmail(user)).status).toBe(200);

		const link = await waitForLink(/http:\/\/[^\s]+\/api\/auth\/verify-email\?token=[^\s]+/, mark);
		expect(link).toContain('token=');
	});
});
