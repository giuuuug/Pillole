import { error, json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { fieldErrors } from '$lib/domain/validation';
import type { User } from './auth';

export type AppUser = User & {
	username?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	birthDate?: string | null;
	bio?: string | null;
};

/**
 * OWASP A01 — Broken Access Control.
 * Ogni endpoint che scrive comincia da qui. Il default e' "vietato":
 * l'autorizzazione non e' un controllo che ci si puo' dimenticare di scrivere.
 */
export function requireUser(event: RequestEvent): AppUser {
	if (!event.locals.user) error(401, 'Devi accedere per continuare');
	return event.locals.user as AppUser;
}

/** Chi non ha ancora scelto un username non puo' comparire nel feed. */
export function requireUsername(event: RequestEvent): AppUser & { username: string } {
	const user = requireUser(event);
	if (!user.username) error(409, 'Scegli prima un username nel tuo profilo');
	return user as AppUser & { username: string };
}

/**
 * Pubblicare richiede solo uno username: il requisito "email verificata" è
 * sospeso (nessuna email parte senza RESEND_API_KEY, vedi CLAUDE.md
 * trappola #8) — tenerlo bloccherebbe la pubblicazione per chiunque, per
 * sempre, senza un percorso d'uscita. Da reintrodurre quando Resend sarà
 * configurato.
 */
export function canPublish(user: AppUser): boolean {
	return Boolean(user.username);
}

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Corpo JSON validato. Rifiuta payload sopra ~256 KB.
 *
 * Il limite si applica ai byte letti davvero, non solo a `content-length`:
 * quell'header è dichiarato dal client, e un body mandato in chunked transfer
 * encoding non lo include affatto, aggirando un controllo che si fermasse lì.
 */
export async function readJson<T extends z.ZodTypeAny>(
	event: RequestEvent,
	schema: T
): Promise<z.infer<T>> {
	const declaredLength = Number(event.request.headers.get('content-length') ?? 0);
	if (declaredLength > MAX_BODY_BYTES) error(413, 'Contenuto troppo grande');

	const body = await readBodyWithLimit(event.request, MAX_BODY_BYTES);
	if (body === null) error(413, 'Contenuto troppo grande');

	let raw: unknown;
	try {
		raw = JSON.parse(body);
	} catch {
		error(400, 'Richiesta non valida');
	}

	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		// 422 con gli errori per campo: il form sa esattamente cosa evidenziare.
		// `error()`, non un Response lanciato a mano: SvelteKit riconosce solo
		// il primo come HttpError e lo serializza correttamente — un Response
		// gettato con `throw` finisce nel percorso degli errori inattesi (500).
		error(422, { message: 'Controlla i campi evidenziati', fields: fieldErrors(parsed.error) });
	}
	return parsed.data;
}

/** Legge lo stream del body contando i byte davvero ricevuti; `null` se supera `maxBytes`. */
async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string | null> {
	const reader = request.body?.getReader();
	if (!reader) return '';

	const chunks: Uint8Array[] = [];
	let total = 0;

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}

	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(merged);
}

export function jsonError(status: number, message: string, fields?: Record<string, string>) {
	return new Response(JSON.stringify({ message, fields }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

/** Query string validata con gli stessi schemi usati dal client. */
export function readQuery<T extends z.ZodTypeAny>(url: URL, schema: T): z.infer<T> {
	const parsed = schema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) error(400, 'Parametri non validi');
	return parsed.data;
}

/**
 * Cache HTTP per le risposte pubbliche.
 * `private` quando la risposta dipende dall'utente: non deve MAI finire in
 * una cache condivisa (una pillola privata servita a un altro utente sarebbe
 * un data leak, OWASP A01).
 */
export function cachedJson(
	data: unknown,
	opts: { seconds: number; private?: boolean } = { seconds: 30 }
) {
	const scope = opts.private ? 'private' : 'public';
	return json(data, {
		headers: {
			'cache-control': `${scope}, max-age=${opts.seconds}, stale-while-revalidate=${opts.seconds * 4}`,
			vary: 'cookie'
		}
	});
}

/* ------------------------------------------------------------------
   Rate limit in memoria per gli endpoint di scrittura.
   Non e' distribuito — su Netlify ogni istanza ha il suo contatore — ma
   con ~20 utenti al giorno gira quasi sempre una sola istanza, e costa 0€.
   Better Auth copre gia' con il suo rate limit le rotte di login.
   ------------------------------------------------------------------ */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
	event: RequestEvent,
	opts: { key: string; max: number; windowMs: number }
) {
	const id = `${opts.key}:${event.locals.user?.id ?? event.getClientAddress()}`;
	const now = Date.now();
	const bucket = buckets.get(id);

	if (!bucket || bucket.resetAt < now) {
		buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
		if (buckets.size > 5000) pruneBuckets(now);
		return;
	}

	if (bucket.count >= opts.max) {
		error(429, 'Troppe richieste, aspetta qualche secondo.');
	}
	bucket.count++;
}

function pruneBuckets(now: number) {
	for (const [key, value] of buckets) {
		if (value.resetAt < now) buckets.delete(key);
	}
}
