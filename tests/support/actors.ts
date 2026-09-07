import { expect } from '@playwright/test';
import { ApiClient } from './client';
import { loadAndVerifyTestEnv } from './env';
import { uniqueUser, type TestUserInput } from './factories';
import { mailMark, waitForLink } from './mail';

const env = loadAndVerifyTestEnv();

export function newClient(ip?: string): ApiClient {
	return new ApiClient(env.baseURL, { ip });
}

function toPath(absoluteUrl: string): string {
	return absoluteUrl.slice(env.baseURL.length);
}

/** Registra un utente nuovo. Non verifica l'email. */
export async function registerUser(
	overrides: Partial<TestUserInput> = {}
): Promise<{ user: TestUserInput; api: ApiClient }> {
	const user = { ...uniqueUser(), ...overrides };
	const api = newClient(user.sourceIp);
	const mark = mailMark();
	const res = await api.signUpEmail(user);
	expect(res.status, `registrazione fallita: ${await res.clone().text()}`).toBe(200);
	// sendOnSignUp:true — l'app manda gia' l'email di verifica alla registrazione.
	await waitForLink(/\/api\/auth\/verify-email\?token=[^\s]+/, mark).catch(() => {
		// Non fatale qui: alcuni test vogliono proprio un utente NON verificato.
	});
	return { user, api };
}

/** Legge il link di verifica dal log e lo visita, come farebbe l'utente cliccando l'email. */
export async function clickVerificationLink(since: number): Promise<Response> {
	const link = await waitForLink(/http:\/\/[^\s]+\/api\/auth\/verify-email\?token=[^\s]+/, since);
	return fetch(link, { redirect: 'manual' });
}

/** Registra un utente e lo porta fino a email verificata (canPublish() vero). */
export async function registerAndVerifyUser(
	overrides: Partial<TestUserInput> = {}
): Promise<{ user: TestUserInput; api: ApiClient }> {
	const user = { ...uniqueUser(), ...overrides };
	const api = newClient(user.sourceIp);
	const mark = mailMark();
	const res = await api.signUpEmail(user);
	expect(res.status, `registrazione fallita: ${await res.clone().text()}`).toBe(200);

	const link = await waitForLink(/http:\/\/[^\s]+\/api\/auth\/verify-email\?token=[^\s]+/, mark);
	const verifyRes = await api.get(toPath(link));
	expect(
		verifyRes.status,
		`verifica email fallita: ${await verifyRes.clone().text()}`
	).toBeLessThan(400);

	return { user, api };
}

export { toPath };
