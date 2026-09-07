import { test, expect } from '@playwright/test';
import { registerAndVerifyUser } from '../support/actors';
import { injectSession } from '../support/browser-auth';
import { uniquePill } from '../support/factories';

/**
 * Audit §7 #2 — il dialogo di conferma eliminazione non è una vera modale:
 * niente focus trap, Esc non chiude, lo sfondo scorre.
 */
test.describe('Dialogo di eliminazione pillola (accessibilità)', () => {
	async function openDeleteDialog(
		page: import('@playwright/test').Page,
		context: import('@playwright/test').BrowserContext
	) {
		const { api } = await registerAndVerifyUser();
		await injectSession(context, api);
		const { id } = await api.json<{ id: string }>(await api.createPill(uniquePill()));

		await page.goto(`/pillole/${id}`);
		const dialog = page.getByRole('dialog', { name: 'Eliminare questa pillola?' });

		// La pagina di dettaglio importa KaTeX (255 KB, audit §7 #3): in dev
		// l'idratazione può richiedere diversi secondi, e un click prima che sia
		// finita non arriva a nessun listener. Si riprova il click finché non
		// "attacca" davvero, invece di indovinare un'attesa fissa.
		await expect(async () => {
			await page.getByRole('button', { name: 'Elimina la pillola' }).click();
			await expect(dialog).toBeVisible({ timeout: 1000 });
		}).toPass({ timeout: 15_000 });

		return dialog;
	}

	test('premere Esc chiude il dialogo', async ({ page, context }) => {
		const dialog = await openDeleteDialog(page, context);

		await page.keyboard.press('Escape');

		await expect(dialog).toBeHidden();
	});

	test('il focus resta intrappolato dentro il dialogo (Tab non raggiunge mai lo sfondo)', async ({
		page,
		context
	}) => {
		await openDeleteDialog(page, context);

		const annulla = page.getByRole('button', { name: 'Annulla' });
		const elimina = page.getByRole('button', { name: 'Elimina', exact: true });

		await expect(annulla).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(elimina).toBeFocused();

		// Chrome, uscendo dall'ultimo elemento del <dialog>, fa una tappa
		// intermedia e innocua su <body> prima di richiudere il giro: non è
		// una fuga dalla trappola, perché <body> non è cliccabile né porta a
		// nulla di interattivo. Quello che conta davvero — mai un link o
		// pulsante dello sfondo (es. "Modifica") — viene verificato qui su
		// diversi giri di Tab.
		for (let i = 0; i < 6; i++) {
			await page.keyboard.press('Tab');
			const reachedBackground = await page.evaluate(() => {
				const el = document.activeElement;
				if (!el || el === document.body) return false;
				return !el.closest('dialog');
			});
			expect(reachedBackground, `Tab #${i + 1} ha raggiunto un elemento fuori dal dialogo`).toBe(
				false
			);
		}

		// E Shift+Tab dal primo elemento non deve mai scappare indietro sullo sfondo.
		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('Shift+Tab');
			const reachedBackground = await page.evaluate(() => {
				const el = document.activeElement;
				if (!el || el === document.body) return false;
				return !el.closest('dialog');
			});
			expect(
				reachedBackground,
				`Shift+Tab #${i + 1} ha raggiunto un elemento fuori dal dialogo`
			).toBe(false);
		}
	});

	test('lo sfondo non scorre mentre il dialogo è aperto', async ({ page, context }) => {
		await openDeleteDialog(page, context);

		const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
		expect(overflow).toBe('hidden');
	});

	test('cliccare "Annulla" chiude il dialogo e riabilita lo scroll', async ({ page, context }) => {
		const dialog = await openDeleteDialog(page, context);

		await page.getByRole('button', { name: 'Annulla' }).click();

		await expect(dialog).toBeHidden();
		const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
		expect(overflow).not.toBe('hidden');
	});
});
