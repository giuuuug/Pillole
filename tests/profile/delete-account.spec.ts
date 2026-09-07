import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';
import { uniquePill } from '../support/factories';
import { getUserByEmail, getPillById } from '../support/db';

test.describe('Chiusura account', () => {
	test('con la password corretta, elimina subito utente e cascata (pillole comprese)', async () => {
		const { user, api } = await registerUser();
		const pill = await api.json<{ id: string }>(
			await api.createPill(uniquePill({ isPublic: true }))
		);

		const res = await api.deleteUser(user.password);
		expect(res.status).toBeLessThan(300);

		expect(await getUserByEmail(user.email)).toBeNull();
		expect(await getPillById(pill.id)).toBeNull();

		const session = await api.json<{ user: unknown } | null>(await api.getSession());
		expect(session?.user ?? null).toBeNull();
	});

	test('con la password sbagliata, rifiuta e NON elimina nulla', async () => {
		const { user, api } = await registerUser();

		const res = await api.deleteUser('password-decisamente-sbagliata-9');
		expect(res.ok).toBe(false);

		expect(await getUserByEmail(user.email)).not.toBeNull();
	});

	test('senza sessione risponde con errore', async () => {
		const api = newClient();
		const res = await api.deleteUser('qualunque');
		expect(res.ok).toBe(false);
	});
});
