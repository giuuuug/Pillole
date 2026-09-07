import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registerAndVerifyUser } from '../support/actors';
import { injectSession } from '../support/browser-auth';
import { uniquePill } from '../support/factories';

/**
 * Scansione automatica (axe-core, WCAG 2.1 A/AA) di ogni pagina dell'app,
 * chiara e scura, desktop e mobile — nata da un audit manuale del 5 settembre
 * 2026 che ha trovato 3 bug reali (vedi CLAUDE.md changelog): un contrasto
 * insufficiente in tema scuro sui badge email di `impostazioni`, un link
 * senza testo accessibile su mobile in `libreria`, e due stati (salvata/
 * preferita) comunicati solo dal colore.
 *
 * Non sostituisce l'ispezione visiva manuale: axe non vede una card
 * "spostata" o un bottone che sembra disabilitato mentre non lo è. Copre
 * solo cio' che si puo' verificare da codice: nomi accessibili, contrasto,
 * landmark, ARIA.
 */

async function auditPage(page: Page, url: string) {
	await page.goto(url, { waitUntil: 'networkidle' }).catch(() => page.goto(url));
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();

	const details = violations
		.map(
			(v) =>
				`${v.id} (${v.impact}): ${v.help}\n` +
				v.nodes.map((n) => `  - ${n.target.join(' ')}: ${n.html}`).join('\n')
		)
		.join('\n\n');

	expect(violations, `${url}\n\n${details}`).toEqual([]);
}

test.describe('Scansione axe — pagine pubbliche', () => {
	for (const url of [
		'/',
		'/accedi',
		'/registrati',
		'/password-dimenticata',
		'/privacy',
		'/termini'
	]) {
		test(`${url} non ha violazioni WCAG`, async ({ page }) => {
			await auditPage(page, url);
		});
	}
});

test.describe('Scansione axe — utente autenticato', () => {
	async function setupData(page: Page, context: import('@playwright/test').BrowserContext) {
		const { user, api } = await registerAndVerifyUser();
		await injectSession(context, api);
		const pub = await api.json<{ id: string }>(
			await api.createPill(uniquePill({ isPublic: true, title: 'Pillola pubblica di audit' }))
		);
		await api.toggleFavorite(pub.id);

		const { user: other, api: otherApi } = await registerAndVerifyUser();
		const otherPill = await otherApi.json<{ id: string }>(
			await otherApi.createPill(uniquePill({ isPublic: true, title: 'Pillola di un altro' }))
		);
		await api.savePill(otherPill.id);
		await api.follow(other.username);

		return { user, pillId: pub.id };
	}

	test('pagine principali non hanno violazioni WCAG (desktop)', async ({ page, context }) => {
		const { user, pillId } = await setupData(page, context);

		for (const url of [
			'/',
			'/libreria',
			'/cerca?q=audit',
			'/nuova',
			`/pillole/${pillId}`,
			`/pillole/${pillId}/modifica`,
			'/profilo',
			'/profilo/modifica',
			'/profilo/sicurezza',
			'/profilo/impostazioni',
			`/u/${user.username}/follower`,
			`/u/${user.username}/seguiti`
		]) {
			await auditPage(page, url);
		}
	});

	test('pagine principali non hanno violazioni WCAG (mobile)', async ({ page, context }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		const { pillId } = await setupData(page, context);

		for (const url of ['/', '/libreria', `/pillole/${pillId}`, '/nuova']) {
			await auditPage(page, url);
		}
	});

	test('pagine principali non hanno violazioni WCAG (tema scuro)', async ({ page, context }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		const { pillId } = await setupData(page, context);

		for (const url of [
			'/',
			'/libreria',
			`/pillole/${pillId}`,
			'/nuova',
			'/profilo/modifica',
			'/profilo/sicurezza',
			'/profilo/impostazioni'
		]) {
			await auditPage(page, url);
		}
	});
});
