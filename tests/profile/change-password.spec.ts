import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';

test.describe('Cambio password', () => {
	test('rifiuta il cambio se la password attuale è sbagliata', async () => {
		const { user, api } = await registerUser();
		const res = await api.changePassword('Password-Sbagliata-9', `${user.password}-nuova`);
		expect(res.ok).toBe(false);

		const check = await newClient(user.sourceIp).signInEmail(user.email, user.password);
		expect(check.status, 'la password originale deve continuare a funzionare').toBe(200);
	});

	test('con la password attuale corretta, la password cambia davvero', async () => {
		const { user, api } = await registerUser();
		const newPassword = `${user.password}-nuova`;

		const res = await api.changePassword(user.password, newPassword);
		expect(res.status).toBe(200);

		const oldLogin = await newClient(user.sourceIp).signInEmail(user.email, user.password);
		expect(oldLogin.ok).toBe(false);

		const newLogin = await newClient(user.sourceIp).signInEmail(user.email, newPassword);
		expect(newLogin.status).toBe(200);
	});

	test('rifiuta una nuova password troppo corta', async () => {
		const { user, api } = await registerUser();
		const res = await api.changePassword(user.password, 'corta1');
		expect(res.ok).toBe(false);
	});

	test('senza sessione risponde con errore, non 200', async () => {
		const api = newClient();
		const res = await api.changePassword('qualunque', 'Qualunque-Password-9');
		expect(res.ok).toBe(false);
	});

	test('cambiare password chiude le altre sessioni attive (revokeOtherSessions)', async () => {
		const { user, api: deviceA } = await registerUser();
		const deviceB = newClient(user.sourceIp);
		await deviceB.signInEmail(user.email, user.password);
		expect((await deviceB.json<{ user: unknown }>(await deviceB.getSession())).user).toBeTruthy();

		await deviceA.changePassword(user.password, `${user.password}-nuova`);

		// noCookieCache: legge lo stato vero, non la cache firmata nel cookie
		// (session.cookieCache in auth.ts, fino a 5 minuti — un compromesso di
		// performance dichiarato, non quello che questo test vuole verificare).
		const afterB = await deviceB.json<{ user: unknown } | null>(
			await deviceB.getSession({ noCookieCache: true })
		);
		expect(afterB?.user ?? null).toBeNull();
	});
});
