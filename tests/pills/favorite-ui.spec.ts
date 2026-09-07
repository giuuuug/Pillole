import { test, expect } from '@playwright/test';
import { registerUser } from '../support/actors';
import { injectSession } from '../support/browser-auth';
import { uniquePill } from '../support/factories';

/**
 * Audit §7 #5 — il filtro "Preferite" esiste ma non c'era modo di segnare
 * una pillola come preferita dalla UI: mostrava sempre una lista vuota anche
 * se l'endpoint /api/pills/:id/favorite (usato qui nel resto della suite a
 * livello API) funziona correttamente.
 */
test.describe('Segnare una pillola come preferita (UI)', () => {
	test('si può segnare una pillola come preferita dal suo dettaglio, e compare nel filtro "Preferite"', async ({
		page,
		context
	}) => {
		const { api } = await registerUser();
		await injectSession(context, api);
		const title = `Pillola da mettere tra le preferite ${Date.now()}`;
		const { id } = await api.json<{ id: string }>(await api.createPill(uniquePill({ title })));

		await page.goto(`/pillole/${id}`);

		const favoriteButton = page.getByRole('button', { name: /preferit/i });
		await expect(favoriteButton).toBeVisible();
		await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false');

		// La pagina importa KaTeX (255 KB, audit §7 #3): in dev l'idratazione
		// può richiedere diversi secondi, e un click prima che sia finita non
		// arriva a nessun listener. Si riprova finché non "attacca" davvero.
		await expect(async () => {
			await favoriteButton.click();
			await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass({ timeout: 15_000 });

		await page.goto('/libreria');
		await page.getByRole('link', { name: 'Preferite', exact: true }).click();
		await expect(page.getByText(title)).toBeVisible();
	});
});
