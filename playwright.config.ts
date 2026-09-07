import { defineConfig, devices } from '@playwright/test';

/**
 * Suite blackbox (funzionale + sicurezza + accessibilità) per Pillole.
 *
 * Gira SEMPRE contro un database di test dedicato — vedi tests/support/env.ts,
 * che rifiuta di partire se DATABASE_URL punta allo stesso host di .env.
 * Un solo worker: i test creano/verificano email leggendo il log del server
 * (vedi tests/support/mail.ts) e condividono i bucket del rate limiter in
 * memoria dell'app — l'esecuzione seriale evita interferenze tra test.
 */
export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	expect: { timeout: 8_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	outputDir: 'test-results/artifacts',
	reporter: [
		['list'],
		['json', { outputFile: 'test-results/results.json' }],
		['html', { outputFolder: 'playwright-html-report', open: 'never' }]
	],
	globalSetup: './tests/support/global-setup.ts',
	use: {
		baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4173',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
