import type { TestPillInput, TestUserInput } from './factories';

/**
 * Client HTTP minimale con cookie jar, per parlare con l'app esattamente come
 * farebbe un browser (cookie di sessione httpOnly inclusi) senza passare da
 * un browser vero. Ogni istanza rappresenta UN utente/sessione: per testare
 * due account in parallelo se ne creano due istanze separate.
 *
 * Deliberatamente "code-agnostic": non importa nulla dal codice server
 * dell'app, solo i contratti HTTP pubblici.
 */
export class ApiClient {
	private cookies = new Map<string, string>();

	/**
	 * `ip`: valore inviato come `x-forwarded-for`. Better Auth (vedi auth.ts,
	 * `advanced.ipAddress.ipAddressHeaders`) usa questo header per il rate
	 * limit quando manca `x-nf-client-connection-ip` (solo su Netlify) — qui
	 * in locale è l'unico modo per dare a ogni "utente" simulato un indirizzo
	 * proprio, cosi' i bucket di rate limit di test diversi non si mescolano.
	 * Il test dedicato al rate limit (security/rate-limiting.spec.ts) è
	 * l'unico che riusa deliberatamente lo stesso IP per più richieste.
	 */
	constructor(
		private baseURL: string,
		private opts: { ip?: string } = {}
	) {}

	private cookieHeader(): string {
		return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
	}

	private storeCookies(res: Response): void {
		const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
		const raw = getSetCookie ? getSetCookie.call(res.headers) : [];
		for (const c of raw) {
			const pair = c.split(';')[0];
			const idx = pair.indexOf('=');
			if (idx === -1) continue;
			this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
		}
	}

	/** Cancella tutti i cookie: simula un browser senza sessione (logout "manuale" lato client). */
	clearCookies(): void {
		this.cookies.clear();
	}

	getCookieRaw(name: string): string | undefined {
		return this.cookies.get(name);
	}

	setCookieRaw(name: string, value: string): void {
		this.cookies.set(name, value);
	}

	async raw(path: string, init: RequestInit & { skipOrigin?: boolean } = {}): Promise<Response> {
		const headers = new Headers(init.headers);
		if (this.cookies.size) headers.set('cookie', this.cookieHeader());
		if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
		if (!init.skipOrigin && !headers.has('origin')) headers.set('origin', this.baseURL);
		if (this.opts.ip && !headers.has('x-forwarded-for'))
			headers.set('x-forwarded-for', this.opts.ip);

		// undici non riesce a fare redirect:'manual' con un body in streaming
		// (ReadableStream) — "expected non-null body source". Solo i test col
		// body in chunked encoding (vedi rate-limiting.spec.ts) ne mandano uno.
		const isStreamBody =
			typeof ReadableStream !== 'undefined' && init.body instanceof ReadableStream;

		const res = await fetch(`${this.baseURL}${path}`, {
			...init,
			headers,
			redirect: isStreamBody ? 'follow' : 'manual'
		});
		this.storeCookies(res);
		return res;
	}

	get(path: string, init: RequestInit = {}) {
		return this.raw(path, { ...init, method: 'GET' });
	}
	post(path: string, body?: unknown, init: RequestInit = {}) {
		return this.raw(path, {
			...init,
			method: 'POST',
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	}
	put(path: string, body?: unknown, init: RequestInit = {}) {
		return this.raw(path, {
			...init,
			method: 'PUT',
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	}
	delete(path: string, init: RequestInit = {}) {
		return this.raw(path, { ...init, method: 'DELETE' });
	}

	async json<T = unknown>(res: Response): Promise<T> {
		const text = await res.text();
		try {
			return JSON.parse(text) as T;
		} catch {
			throw new Error(
				`Risposta non JSON (status ${res.status}) da ${res.url}: ${text.slice(0, 300)}`
			);
		}
	}

	/* ---------------- Better Auth ---------------- */

	signUpEmail(user: TestUserInput, extra: Record<string, unknown> = {}) {
		return this.post('/api/auth/sign-up/email', {
			email: user.email,
			password: user.password,
			name: `${user.firstName} ${user.lastName}`,
			username: user.username,
			firstName: user.firstName,
			lastName: user.lastName,
			birthDate: user.birthDate,
			...extra
		});
	}

	signInEmail(email: string, password: string) {
		return this.post('/api/auth/sign-in/email', { email, password });
	}

	signInUsername(username: string, password: string) {
		return this.post('/api/auth/sign-in/username', { username, password });
	}

	signOut() {
		return this.post('/api/auth/sign-out');
	}

	/**
	 * `noCookieCache`: ignora la cache firmata nel cookie di sessione (vedi
	 * auth.ts, `session.cookieCache`, fino a 5 minuti) e rilegge lo stato vero
	 * dal database. Senza, un test appena dopo una revoca vedrebbe ancora la
	 * sessione valida per la durata della cache — non un bug, un compromesso
	 * di performance dichiarato nel codice.
	 */
	getSession(opts: { noCookieCache?: boolean } = {}) {
		return this.get(`/api/auth/get-session${opts.noCookieCache ? '?disableCookieCache=true' : ''}`);
	}

	verifyEmail(token: string, callbackURL?: string) {
		const qs = new URLSearchParams({ token, ...(callbackURL ? { callbackURL } : {}) });
		return this.get(`/api/auth/verify-email?${qs}`);
	}

	sendVerificationEmail(email: string, callbackURL = '/') {
		return this.post('/api/auth/send-verification-email', { email, callbackURL });
	}

	requestPasswordReset(email: string, redirectTo = '/reimposta-password') {
		return this.post('/api/auth/request-password-reset', { email, redirectTo });
	}

	resetPassword(token: string, newPassword: string) {
		return this.post('/api/auth/reset-password', { newPassword, token });
	}

	changePassword(currentPassword: string, newPassword: string, revokeOtherSessions = true) {
		return this.post('/api/auth/change-password', {
			currentPassword,
			newPassword,
			revokeOtherSessions
		});
	}

	changeEmail(newEmail: string, callbackURL = '/') {
		return this.post('/api/auth/change-email', { newEmail, callbackURL });
	}

	deleteUser(password?: string) {
		return this.post('/api/auth/delete-user', password ? { password } : {});
	}

	/* ---------------- App API ---------------- */

	createPill(input: TestPillInput) {
		return this.post('/api/pills', input);
	}
	updatePill(id: string, input: TestPillInput) {
		return this.put(`/api/pills/${id}`, input);
	}
	deletePill(id: string) {
		return this.delete(`/api/pills/${id}`);
	}
	// Non esiste un GET /api/pills/:id — vedi tests/support/sveltekit-data.ts::fetchPill.
	toggleFavorite(id: string) {
		return this.post(`/api/pills/${id}/favorite`);
	}
	savePill(id: string) {
		return this.post(`/api/pills/${id}/save`);
	}
	unsavePill(id: string) {
		return this.delete(`/api/pills/${id}/save`);
	}
	follow(username: string) {
		return this.post(`/api/utenti/${username}/follow`);
	}
	unfollow(username: string) {
		return this.delete(`/api/utenti/${username}/follow`);
	}
	search(params: Record<string, string>) {
		return this.get(`/api/cerca?${new URLSearchParams(params)}`);
	}
	feed(params: Record<string, string> = {}) {
		return this.get(`/api/feed?${new URLSearchParams(params)}`);
	}
	library(params: Record<string, string> = {}) {
		return this.get(`/api/libreria?${new URLSearchParams(params)}`);
	}
	updateProfile(input: Record<string, unknown>) {
		return this.put('/api/profilo', input);
	}
}
