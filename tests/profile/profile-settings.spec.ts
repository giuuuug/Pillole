import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';
import { uniqueUser } from '../support/factories';
import { getUserByEmail } from '../support/db';

function validUpdate(overrides: Record<string, unknown> = {}) {
	return {
		firstName: 'Nome',
		lastName: 'Cognome',
		username: uniqueUser('upd').username,
		birthDate: '1995-06-15',
		bio: 'Una bio di prova.',
		...overrides
	};
}

test.describe('Profilo — dati anagrafici', () => {
	test('aggiorna nome, cognome, username, data di nascita e bio', async () => {
		const { user, api } = await registerUser();
		const update = validUpdate();

		const res = await api.updateProfile(update);
		expect(res.status).toBe(200);

		const row = await getUserByEmail(user.email);
		expect(row!.firstName).toBe(update.firstName);
		expect(row!.lastName).toBe(update.lastName);
		expect(row!.username).toBe(update.username);
		expect(row!.bio).toBe(update.bio);
	});

	test('rifiuta un username già preso da un altro utente', async () => {
		const other = await registerUser();
		const { api } = await registerUser();

		const res = await api.updateProfile(validUpdate({ username: other.user.username }));
		expect(res.status).toBe(409);
	});

	test('rifiuta uno username riservato', async () => {
		const { api } = await registerUser();
		const res = await api.updateProfile(validUpdate({ username: 'support' }));
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test('rifiuta una data di nascita sotto i 14 anni', async () => {
		const { api } = await registerUser();
		const tenYearsAgo = new Date();
		tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
		const res = await api.updateProfile(
			validUpdate({ birthDate: tenYearsAgo.toISOString().slice(0, 10) })
		);
		expect(res.status).toBe(422);
	});

	test('rifiuta una bio più lunga di 280 caratteri', async () => {
		const { api } = await registerUser();
		const res = await api.updateProfile(validUpdate({ bio: 'x'.repeat(281) }));
		expect(res.status).toBe(422);
	});

	test('senza sessione risponde 401', async () => {
		const api = newClient();
		const res = await api.updateProfile(validUpdate());
		expect(res.status).toBe(401);
	});

	test('salva un payload di injection nella bio come testo letterale', async () => {
		const { user, api } = await registerUser();
		const payload = `<img src=x onerror=alert(1)>'; DROP TABLE pill;--`;

		const res = await api.updateProfile(validUpdate({ bio: payload }));
		expect(res.status).toBe(200);

		const row = await getUserByEmail(user.email);
		expect(row!.bio).toBe(payload);
	});
});
