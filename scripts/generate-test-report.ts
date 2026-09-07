/**
 * Legge test-results/results.json (reporter JSON di Playwright, prodotto da
 * ogni esecuzione di `npm run test:e2e`) e genera docs/index.html: un
 * riepilogo di TUTTI i test eseguiti, quali sono passati e quali no, coi
 * dettagli dell'errore per questi ultimi.
 *
 * Non inventa nulla: se results.json non esiste (la suite non è mai stata
 * lanciata) si ferma con un errore invece di produrre un report vuoto che
 * sembri un successo.
 *
 *   node --experimental-strip-types scripts/generate-test-report.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const resultsPath = path.join(root, 'test-results', 'results.json');
const outPath = path.join(root, 'docs', 'index.html');

if (!fs.existsSync(resultsPath)) {
	console.error(
		`Non trovo ${resultsPath}. Lancia prima la suite: npm run test:e2e (anche se fallisce, il reporter JSON viene scritto comunque).`
	);
	process.exit(1);
}

type PwError = { message?: string; stack?: string };
type PwResult = {
	status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
	duration: number;
	error?: PwError;
	errors?: PwError[];
	retry: number;
};
type PwTest = { projectName: string; results: PwResult[]; status?: string };
type PwSpec = { title: string; file: string; tests: PwTest[]; ok?: boolean };
type PwSuite = { title: string; file?: string; suites?: PwSuite[]; specs?: PwSpec[] };
type PwReport = {
	suites: PwSuite[];
	stats: { expected: number; unexpected: number; skipped: number; flaky: number; duration: number };
};

const report: PwReport = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

type FlatTest = {
	file: string;
	path: string[]; // titoli dei describe, dal più esterno
	title: string;
	status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky';
	duration: number;
	errorMessage: string | null;
};

const flat: FlatTest[] = [];

function walkSuite(suite: PwSuite, ancestry: string[], fileHint: string) {
	const file = suite.file ?? fileHint;
	const nextAncestry = suite.title ? [...ancestry, suite.title] : ancestry;
	for (const spec of suite.specs ?? []) {
		for (const t of spec.tests) {
			const last = t.results.at(-1);
			const anyFailed = t.results.some((r) => r.status === 'failed' || r.status === 'timedOut');
			const status: FlatTest['status'] =
				t.results.length > 1 && !anyFailed ? 'flaky' : (last?.status ?? 'skipped');
			const errParts = (last?.errors?.length ? last.errors : last?.error ? [last.error] : [])
				.map((e) => e?.message ?? '')
				.filter(Boolean);
			flat.push({
				file,
				path: nextAncestry,
				title: spec.title,
				status,
				duration: last?.duration ?? 0,
				errorMessage: errParts.length ? errParts.join('\n---\n') : null
			});
		}
	}
	for (const child of suite.suites ?? []) walkSuite(child, nextAncestry, file);
}

for (const suite of report.suites) walkSuite(suite, [], suite.file ?? '');

const totals = {
	total: flat.length,
	passed: flat.filter((t) => t.status === 'passed').length,
	failed: flat.filter(
		(t) => t.status === 'failed' || t.status === 'timedOut' || t.status === 'interrupted'
	).length,
	skipped: flat.filter((t) => t.status === 'skipped').length,
	flaky: flat.filter((t) => t.status === 'flaky').length
};
const passRate = totals.total ? Math.round((totals.passed / totals.total) * 1000) / 10 : 0;

const byFile = new Map<string, FlatTest[]>();
for (const t of flat) {
	const key = t.file;
	if (!byFile.has(key)) byFile.set(key, []);
	byFile.get(key)!.push(t);
}

function esc(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function statusBadge(status: FlatTest['status']): string {
	const map: Record<FlatTest['status'], [string, string]> = {
		passed: ['#0f766e', 'Passato'],
		failed: ['#be123c', 'Fallito'],
		timedOut: ['#be123c', 'Timeout'],
		interrupted: ['#be123c', 'Interrotto'],
		skipped: ['#78716c', 'Saltato'],
		flaky: ['#b45309', 'Instabile']
	};
	const [color, label] = map[status];
	return `<span class="badge" style="background:${color}">${label}</span>`;
}

const generatedAt = new Date().toISOString();

const fileSections = [...byFile.entries()]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([file, tests]) => {
		const filePassed = tests.filter((t) => t.status === 'passed').length;
		const relFile = path.relative(root, file).replace(/\\/g, '/');
		const rows = tests
			.map((t) => {
				const errorBlock = t.errorMessage ? `<pre class="error">${esc(t.errorMessage)}</pre>` : '';
				return `<div class="test-row status-${t.status}">
					<div class="test-row-head">
						${statusBadge(t.status)}
						<span class="test-path">${esc(t.path.join(' › '))}</span>
						<span class="test-title">${esc(t.title)}</span>
						<span class="test-duration">${t.duration}ms</span>
					</div>
					${errorBlock}
				</div>`;
			})
			.join('\n');
		return `<section class="file-section">
			<h2>${esc(relFile)} <span class="file-count">${filePassed}/${tests.length} passati</span></h2>
			${rows}
		</section>`;
	})
	.join('\n');

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>Report test blackbox — Pillole</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<style>
	:root { color-scheme: light dark; }
	* { box-sizing: border-box; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		margin: 0; padding: 0;
		background: #f8fafc; color: #0f172a;
	}
	@media (prefers-color-scheme: dark) {
		body { background: #0b1120; color: #e2e8f0; }
		.file-section, .summary-card { background: #111827 !important; border-color: #1f2937 !important; }
		.error { background: #1c0a10 !important; color: #fecdd3 !important; }
		.test-row { border-color: #1f2937 !important; }
	}
	header { padding: 32px 24px 16px; max-width: 1000px; margin: 0 auto; }
	h1 { margin: 0 0 4px; font-size: 1.6rem; }
	.meta { color: #64748b; font-size: 0.9rem; }
	.summary { display: flex; gap: 12px; flex-wrap: wrap; max-width: 1000px; margin: 16px auto; padding: 0 24px; }
	.summary-card {
		flex: 1; min-width: 120px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
		padding: 14px 16px;
	}
	.summary-card .n { font-size: 1.6rem; font-weight: 800; display: block; }
	.summary-card .l { font-size: 0.8rem; color: #64748b; }
	main { max-width: 1000px; margin: 0 auto; padding: 0 24px 64px; }
	.file-section {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
		padding: 16px 18px; margin-bottom: 16px;
	}
	.file-section h2 { font-size: 0.95rem; font-family: ui-monospace, monospace; margin: 0 0 10px; word-break: break-all; }
	.file-count { font-weight: 400; color: #64748b; font-size: 0.85rem; }
	.test-row { border-top: 1px solid #f1f5f9; padding: 8px 0; }
	.test-row:first-of-type { border-top: none; }
	.test-row-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.88rem; }
	.badge { color: #fff; border-radius: 999px; padding: 2px 9px; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }
	.test-path { color: #64748b; }
	.test-title { font-weight: 600; }
	.test-duration { margin-left: auto; color: #94a3b8; font-size: 0.78rem; flex-shrink: 0; }
	.error {
		margin: 8px 0 2px; padding: 10px 12px; background: #fef2f2; color: #991b1b;
		border-radius: 8px; font-size: 0.78rem; white-space: pre-wrap; overflow-x: auto;
		font-family: ui-monospace, monospace;
	}
	.status-failed .test-title, .status-timedOut .test-title, .status-interrupted .test-title { color: #be123c; }
	.findings { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; }
	.findings h2 { margin: 0 0 12px; font-size: 1.05rem; }
	.finding { padding: 10px 0; border-top: 1px solid #f1f5f9; }
	.finding:first-of-type { border-top: none; padding-top: 0; }
	.finding .f-title { font-weight: 700; font-size: 0.92rem; }
	.finding .f-badge { display: inline-block; font-size: 0.7rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; margin-right: 6px; color: #fff; }
	.finding .f-desc { font-size: 0.85rem; color: #475569; margin-top: 3px; }
	.badge-fixed { background: #0f766e; }
	.badge-noted { background: #b45309; }
	.badge-refuted { background: #64748b; }
</style>
</head>
<body>
<header>
	<h1>Report test blackbox — Pillole</h1>
	<div class="meta">Generato il ${esc(generatedAt)} · durata totale ${(report.stats.duration / 1000).toFixed(1)}s</div>
</header>
<div class="summary">
	<div class="summary-card"><span class="n">${totals.total}</span><span class="l">Test totali</span></div>
	<div class="summary-card"><span class="n" style="color:#0f766e">${totals.passed}</span><span class="l">Passati</span></div>
	<div class="summary-card"><span class="n" style="color:#be123c">${totals.failed}</span><span class="l">Falliti</span></div>
	<div class="summary-card"><span class="n" style="color:#78716c">${totals.skipped}</span><span class="l">Saltati</span></div>
	<div class="summary-card"><span class="n" style="color:#b45309">${totals.flaky}</span><span class="l">Instabili</span></div>
	<div class="summary-card"><span class="n">${passRate}%</span><span class="l">Percentuale passati</span></div>
</div>
<main>
<section class="findings">
	<h2>Bug trovati e corretti in questa sessione</h2>
	<div class="finding">
		<span class="f-badge badge-fixed">Corretto</span><span class="f-title">Ogni fallimento di validazione rispondeva 500 invece di 422/413</span>
		<div class="f-desc">guards.ts::readJson lanciava un Response grezzo invece di usare error() di SvelteKit: qualunque input non valido (bio troppo lunga, sources con URL javascript:, ecc.) crashava con un errore generico invece del messaggio per campo. Confermato anche su una build di produzione reale, non solo in dev.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-fixed">Corretto</span><span class="f-title">La registrazione via API bypassava le regole di dominio</span>
		<div class="f-desc">signUpSchema (età ≥14, nome/cognome, username riservati) valeva solo nel form: chiamando l'endpoint di Better Auth direttamente si poteva creare un account minorenne, senza nome, o con username come "admin". Aggiunto un databaseHooks.user.create.before che applica le stesse regole lato server.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-fixed">Corretto</span><span class="f-title">Una pillola resa privata restava visibile a chi l'aveva salvata (audit §7 #1)</span>
		<div class="f-desc">getLibrary/getShelfCounts non ricontrollavano isPublic per le pillole salvate da altri: titolo e anteprima restavano visibili anche dopo che l'autore la rendeva privata.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-fixed">Corretto</span><span class="f-title">Il limite di 256 KB sul body si aggirava con chunked encoding (audit §7 #6)</span>
		<div class="f-desc">Il controllo si basava solo su content-length, assente con Transfer-Encoding: chunked. Ora i byte vengono contati leggendo davvero lo stream.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-fixed">Corretto</span><span class="f-title">Il dialogo di eliminazione non era una vera modale (audit §7 #2)</span>
		<div class="f-desc">Niente focus trap, Esc non chiudeva, lo sfondo scorreva. Sostituito con un &lt;dialog&gt; nativo (showModal), che risolve tutti e tre insieme.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-fixed">Corretto</span><span class="f-title">Non c'era modo di segnare una pillola preferita dalla UI (audit §7 #5)</span>
		<div class="f-desc">Il filtro "Preferite" esisteva ma restava sempre vuoto: aggiunto un pulsante nella pagina di dettaglio, che usa l'endpoint (già funzionante) /api/pills/:id/favorite.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-refuted">Verificato, non confermato</span><span class="f-title">Cambiare email NON spubblica silenziosamente le pillole (audit §7 #7)</span>
		<div class="f-desc">Tracciato il flusso two-step di Better Auth 1.7.2: al termine del cambio l'email risulta di nuovo verificata, quindi canPublish resta vero. Non riprodotto empiricamente — la riga andrebbe tolta o riformulata nell'audit.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-noted">Da tenere presente</span><span class="f-title">La cache di sessione nel cookie ritarda la revoca fino a 5 minuti</span>
		<div class="f-desc">session.cookieCache (auth.ts) è un compromesso di performance dichiarato: dopo un cambio/reset password, un'altra sessione aperta può restare valida (letta dal cookie, non dal database) fino a 5 minuti. Non è un bug, ma vale la pena saperlo.</div>
	</div>
	<div class="finding">
		<span class="f-badge badge-noted">Solo in dev</span><span class="f-title">/.env, /src/**/*.ts e /node_modules/** rispondono diversamente in vite dev</span>
		<div class="f-desc">In sviluppo Vite espone alcuni percorsi (403 sui dotfile, /src/**/*.ts come modulo, /node_modules/** per risolvere le dipendenze) che una build di produzione reale non espone affatto: verificato a mano con vite build && vite preview il 2026-09-04 — tutti i percorsi rispondono 404.</div>
	</div>
</section>
${fileSections}
</main>
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf-8');
console.log(
	`Report scritto in ${outPath} — ${totals.passed}/${totals.total} passati (${passRate}%).`
);
