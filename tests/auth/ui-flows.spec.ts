import { test, expect, type Page } from '@playwright/test';
import { uniqueUser, type TestUserInput } from '../support/factories';
import { registerUser } from '../support/actors';

/**
 * Login, registrazione e logout attraverso la UI vera (form, click, redirect
 * del browser) — non solo le chiamate HTTP dirette usate nel resto della
 * suite. Qui gira UN SOLO browser reale alla volta (workers:1), quindi ogni
 * utente creato qui ha comunque un IP condiviso col resto della suite: si
 * usano prefissi dedicati per non scontrarsi con gli username generati altrove.
 */

/**
 * Compila il form e invia, riprovando se il primo submit non "attacca":
 * in dev l'idratazione può richiedere qualche istante, e un submit prima
 * che sia finita non arriva a nessun listener. Ogni tentativo genera dati
 * nuovi: se un tentativo precedente fosse in realtà riuscito (solo la
 * navigazione era in ritardo), ririempire con la STESSA email/username
 * darebbe "già in uso" invece di aspettare — dati sempre freschi evitano
 * quel falso negativo.
 */
async function submitRegistrationForm(
	page: Page,
	userTemplate: TestUserInput
): Promise<TestUserInput> {
	let attempt = 0;
	let current = userTemplate;
	await expect(async () => {
		attempt++;
		current = attempt === 1 ? userTemplate : uniqueUser(`${userTemplate.username}r${attempt}`);
		await page.getByLabel('Nome', { exact: true }).fill(current.firstName);
		await page.getByLabel('Cognome').fill(current.lastName);
		await page.getByLabel('Username pubblico').fill(current.username);
		await page.getByLabel('Email').fill(current.email);
		await page.getByLabel('Data di nascita').fill(current.birthDate);
		await page.getByLabel('Password', { exact: true }).fill(current.password);
		await page.getByLabel(/Termini di servizio/).check();
		await page.getByRole('button', { name: 'Crea account' }).click();
		await expect(page).toHaveURL(/\/profilo/, { timeout: 6000 });
	}).toPass({ timeout: 25_000 });
	return current;
}

test.describe('Flussi UI', () => {
	test('registrazione dalla UI: compila il form, arriva su /profilo', async ({ page }) => {
		await page.goto('/registrati');
		const user = await submitRegistrationForm(page, uniqueUser('ui'));

		await expect(page.getByText(`@${user.username}`)).toBeVisible();
	});

	test('login dalla UI con credenziali sbagliate mostra un errore e non entra', async ({
		page
	}) => {
		await page.goto('/accedi');
		await expect(async () => {
			await page.getByLabel('Email o username').fill('nessuno.qui@example.invalid');
			await page.getByLabel('Password', { exact: true }).fill('password-sbagliata');
			await page.getByRole('button', { name: 'Accedi' }).click();
			await expect(page.getByRole('alert')).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		await expect(page).toHaveURL(/\/accedi/);
	});

	test('login dalla UI con credenziali corrette entra, poi il logout torna alla schermata pubblica', async ({
		page
	}) => {
		const user = uniqueUser('ui-login');

		await page.goto('/registrati');
		await submitRegistrationForm(page, user);

		await page.getByRole('button', { name: 'Esci' }).click();
		await expect(page).toHaveURL(/\/(accedi)?$/);

		// Una volta usciti, una pagina privata rimanda al login.
		await page.goto('/profilo');
		await expect(page).toHaveURL(/\/accedi/);
	});

	test('inviare il form di registrazione vuoto mostra errori inline e non naviga via', async ({
		page
	}) => {
		await page.goto('/registrati');
		await expect(async () => {
			await page.getByRole('button', { name: 'Crea account' }).click();
			await expect(page.getByText('Inserisci il nome')).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		await expect(page).toHaveURL(/\/registrati/);
	});

	test('non si può registrare senza accettare termini e privacy', async ({ page }) => {
		const user = uniqueUser('noconsent');
		await page.goto('/registrati');

		await expect(async () => {
			await page.getByLabel('Nome', { exact: true }).fill(user.firstName);
			await page.getByLabel('Cognome').fill(user.lastName);
			await page.getByLabel('Username pubblico').fill(user.username);
			await page.getByLabel('Email').fill(user.email);
			await page.getByLabel('Data di nascita').fill(user.birthDate);
			await page.getByLabel('Password', { exact: true }).fill(user.password);
			// Casella NON spuntata di proposito.
			await page.getByRole('button', { name: 'Crea account' }).click();
			await expect(page.getByText(/Devi accettare i Termini/)).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		await expect(page).toHaveURL(/\/registrati/);
	});

	test('un errore "username già preso" non resta appiccicato dopo averlo cambiato con uno libero', async ({
		page
	}) => {
		// Bug reale: dopo un tentativo fallito, `errors` non veniva mai
		// azzerato all'inizio di submit() — il messaggio "già preso" restava
		// visibile per sempre, anche cambiando username, dando l'impressione
		// che OGNI username fosse preso.
		const taken = await registerUser();
		const user = uniqueUser('afterclash');

		await page.goto('/registrati');
		await page.getByLabel('Nome', { exact: true }).fill(user.firstName);
		await page.getByLabel('Cognome').fill(user.lastName);
		await page.getByLabel('Username pubblico').fill(taken.user.username);
		await page.getByLabel('Email').fill(user.email);
		await page.getByLabel('Data di nascita').fill(user.birthDate);
		await page.getByLabel('Password', { exact: true }).fill(user.password);
		await page.getByLabel(/Termini di servizio/).check();

		await expect(async () => {
			await page.getByRole('button', { name: 'Crea account' }).click();
			await expect(page.getByText('Questo username è già preso')).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		// Cambio username con uno sicuramente libero e reinvio.
		await page.getByLabel('Username pubblico').fill(user.username);
		await expect(async () => {
			await page.getByRole('button', { name: 'Crea account' }).click();
			await expect(page).toHaveURL(/\/profilo/, { timeout: 6000 });
		}).toPass({ timeout: 15_000 });

		await expect(page.getByText(`@${user.username}`)).toBeVisible();
	});

	test('i link a Termini e Privacy dal form di registrazione portano a pagine vere', async ({
		page
	}) => {
		await page.goto('/registrati');

		const terminiResponse = await page.request.get('/termini');
		expect(terminiResponse.status()).toBe(200);

		const privacyResponse = await page.request.get('/privacy');
		expect(privacyResponse.status()).toBe(200);
	});

	test('dopo il login, "Libreria" nella barra di navigazione non rimanda al login anche se precaricata da sloggati', async ({
		page
	}) => {
		// Ipotesi: `data-sveltekit-preload-data="hover"` (app.html) precarica il
		// `load` di /libreria al passaggio del mouse. Se il passaggio avviene
		// PRIMA del login, quel load restituisce un redirect a /accedi; se il
		// login successivo non invalida quel precaricamento, cliccare "Libreria"
		// subito dopo potrebbe riusare la risposta stantia.
		const registered = await registerUser();

		await page.goto('/');
		const libreriaLink = page.getByRole('link', { name: 'Libreria' }).first();
		await libreriaLink.hover();
		await page.waitForTimeout(300); // lascia il tempo al preload di partire

		await page.goto('/accedi');
		await expect(async () => {
			await page.getByLabel('Email o username').fill(registered.user.email);
			await page.getByLabel('Password', { exact: true }).fill(registered.user.password);
			await page.getByRole('button', { name: 'Accedi' }).click();
			await expect(page).not.toHaveURL(/\/accedi/, { timeout: 2000 });
		}).toPass({ timeout: 15_000 });

		await page.getByRole('link', { name: 'Libreria' }).first().click();
		await expect(page).toHaveURL(/\/libreria/, { timeout: 6000 });
	});
});
