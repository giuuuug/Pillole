import { test, expect } from '@playwright/test';
import { newClient, registerUser } from '../support/actors';

test.describe('Header di sicurezza ed esposizione di file sensibili', () => {
	test('gli header di sicurezza OWASP A05 sono presenti su una risposta qualsiasi', async () => {
		const res = await newClient().get('/');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('x-frame-options')).toBe('DENY');
		expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect(res.headers.get('permissions-policy')).toContain('camera=()');
	});

	test("gli header di sicurezza ci sono anche sulle risposte JSON dell'API", async () => {
		const res = await newClient().feed();
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('x-frame-options')).toBe('DENY');
	});

	test('nessuno script inline viene bloccato dalla CSP al caricamento della pagina', async ({
		page
	}) => {
		// Lo script anti-flash del tema in app.html è l'unico inline dell'app:
		// senza `nonce="%sveltekit.nonce%"` la CSP (script-src 'self') lo blocca
		// silenziosamente e il tema scuro non si applica mai prima del primo paint.
		const cspViolations: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) {
				cspViolations.push(msg.text());
			}
		});

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		expect(cspViolations, cspViolations.join('\n')).toHaveLength(0);
	});

	// Questa suite gira contro `vite dev` (serve leggere i log per email di
	// verifica/reset — vedi tests/support/mail.ts), che di suo espone alcuni
	// percorsi diversamente da una build reale (403 invece di 404 sui
	// dotfile per `server.fs.deny`, /src/**/*.ts servito come modulo per
	// l'HMR, /node_modules/** servito per risolvere le dipendenze): sono
	// comportamenti noti e documentati di Vite in sviluppo, non di
	// quest'app. Verificato a mano su una build di produzione reale
	// (`vite build && vite preview`) il 2026-09-04: TUTTI i percorsi qui
	// sotto, incluso /src/lib/server/auth.ts e /node_modules/**,
	// rispondono 404 — vedi docs/index.html.
	for (const p of [
		'/.env',
		'/.env.example',
		'/.git/config',
		'/.git/HEAD',
		'/package.json',
		'/drizzle/0000_init.sql',
		'/drizzle.config.ts'
	]) {
		test(`${p} non è raggiungibile pubblicamente (404 o 403)`, async () => {
			const res = await newClient().get(p);
			expect([403, 404], `${p} ha risposto ${res.status} — non deve essere servito`).toContain(
				res.status
			);
			const text = await res.text();
			expect(text).not.toMatch(/DATABASE_URL|BETTER_AUTH_SECRET|password/i);
		});
	}

	test('le risposte di errore non includono uno stack trace o dettagli interni', async () => {
		const res = await newClient().get('/api/pills/id-inesistente-per-forzare-un-errore');
		const text = await res.text();
		expect(text).not.toMatch(/at [A-Za-z].*\(.*:\d+:\d+\)/); // formato tipico di uno stack trace Node
		expect(text).not.toContain('node_modules');
	});

	test("un tentativo di path traversal nell'URL non espone file fuori dalla webroot", async () => {
		const res = await newClient().get('/api/pills/..%2f..%2f..%2fetc%2fpasswd');
		expect(res.status).toBeLessThan(500);
		const text = await res.text();
		expect(text).not.toContain('root:');
	});

	test('un metodo HTTP non supportato su una rotta esistente non va in 500', async () => {
		const res = await newClient().raw('/api/feed', { method: 'PATCH' });
		expect(res.status).toBeLessThan(500);
	});

	test('un JSON malformato nel corpo della richiesta risponde 400, non 500', async () => {
		const { api } = await registerUser();
		const res = await api.raw('/api/pills', {
			method: 'POST',
			body: '{ questo non è json valido',
			headers: { 'content-type': 'application/json' }
		});
		expect(res.status).toBe(400);
	});

	test('un content-type inatteso su un body JSON non causa un errore server', async () => {
		const { api } = await registerUser();
		const res = await api.raw('/api/pills', {
			method: 'POST',
			body: 'title=x&body=y',
			headers: { 'content-type': 'application/x-www-form-urlencoded' }
		});
		expect(res.status).toBeLessThan(500);
	});
});
