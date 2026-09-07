import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadAndVerifyTestEnv } from './env';

/**
 * Avvia il server di sviluppo (vite dev) come processo figlio, puntato al
 * database di TEST (mai a quello reale — vedi env.ts), e ne registra
 * stdout/stderr su file: e' il nostro "mailbox" per leggere i link di
 * verifica email / reset password che l'app logga quando RESEND_API_KEY
 * non e' configurata (vedi src/lib/server/email.ts).
 */
export default async function globalSetup() {
	const env = loadAndVerifyTestEnv();

	const root = path.resolve(import.meta.dirname, '..', '..');
	fs.mkdirSync(path.dirname(env.devServerLogPath), { recursive: true });
	const logStream = fs.createWriteStream(env.devServerLogPath);
	await new Promise((resolve) => logStream.once('open', resolve));

	console.log(
		`[global-setup] Avvio il server di test su ${env.baseURL} (log: ${env.devServerLogPath})`
	);

	const child: ChildProcess = spawn(
		process.execPath,
		[
			path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
			'dev',
			'--port',
			String(env.port),
			'--strictPort',
			'--mode',
			'test'
		],
		{
			cwd: root,
			env: { ...process.env },
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);
	child.stdout?.pipe(logStream);
	child.stderr?.pipe(logStream);

	child.on('exit', (code, signal) => {
		if (code !== null && code !== 0) {
			console.error(
				`[global-setup] Il server di test è terminato inaspettatamente (code=${code}, signal=${signal})`
			);
		}
	});

	await waitForServer(env.baseURL, 45_000);
	console.log('[global-setup] Server di test pronto.');

	return async () => {
		logStream.close();
		if (!child.pid) return;
		if (process.platform === 'win32') {
			// `child.kill()` su Windows non chiude i processi figli di npx/vite: serve taskkill /T.
			spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
		} else {
			child.kill('SIGTERM');
		}
	};
}

async function waitForServer(baseURL: string, timeoutMs: number): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(baseURL, { redirect: 'manual' });
			if (res.status < 500) return;
		} catch {
			// server non ancora in ascolto
		}
		await new Promise((r) => setTimeout(r, 300));
	}
	throw new Error(`Il server di test non ha risposto entro ${timeoutMs}ms su ${baseURL}`);
}
