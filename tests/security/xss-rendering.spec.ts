import { test, expect } from '@playwright/test';
import { registerAndVerifyUser } from '../support/actors';
import { injectSession } from '../support/browser-auth';
import { uniquePill } from '../support/factories';

/**
 * render.ts costruisce l'HTML del corpo di una pillola da testo utente
 * neutralizzato (vedi commenti OWASP A03 nel file). Questi test caricano
 * davvero la pagina in un browser e verificano che nessun payload esegua
 * codice — non si fidano della sola risposta JSON.
 */
test.describe('XSS nel corpo di una pillola (rendering reale)', () => {
	const PAYLOADS = [
		`<script>window.__xss = 'script'</script>`,
		`<img src=x onerror="window.__xss='onerror'">`,
		`<a href="javascript:window.__xss='href'">click</a>`,
		`[link](javascript:window.__xss='markdown-link')`,
		`<svg onload="window.__xss='svg'">`
	];

	for (const payload of PAYLOADS) {
		test(`il payload "${payload.slice(0, 40)}…" non esegue codice nella pagina di dettaglio`, async ({
			page,
			context
		}) => {
			const { api } = await registerAndVerifyUser();
			await injectSession(context, api);

			const { id } = await api.json<{ id: string }>(
				await api.createPill(
					uniquePill({
						isPublic: true,
						body: `Testo prima. ${payload} Testo dopo, abbastanza lungo da validare.`
					})
				)
			);

			await page.goto(`/pillole/${id}`);
			await page.waitForLoadState('networkidle');

			const executed = await page.evaluate(() => (window as unknown as { __xss?: string }).__xss);
			expect(executed, `il payload ha eseguito codice: ${executed}`).toBeUndefined();
		});
	}

	test('un titolo con tag HTML viene mostrato come testo, non interpretato', async ({
		page,
		context
	}) => {
		const { api } = await registerAndVerifyUser();
		await injectSession(context, api);
		const title = `<b>Grassetto finto</b>`;

		const { id } = await api.json<{ id: string }>(
			await api.createPill(uniquePill({ isPublic: true, title }))
		);

		await page.goto(`/pillole/${id}`);
		await expect(page.locator('h1')).toHaveText(title);
		expect(await page.locator('h1 b').count()).toBe(0);
	});
});
