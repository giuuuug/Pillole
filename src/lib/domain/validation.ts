import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

/* ============================================================
   OWASP A03 — Injection / A04 — Insecure Design
   Ogni input che arriva dal client passa da qui, sia lato client
   (feedback immediato) che lato server (unica fonte di verita').
   ============================================================ */

/** Solo http/https: blocca `javascript:`, `data:` e simili nelle fonti. */
export const safeUrl = z
	.string()
	.trim()
	.max(500, 'Il link è troppo lungo')
	.refine(
		(v) => {
			try {
				const u = new URL(v);
				return u.protocol === 'http:' || u.protocol === 'https:';
			} catch {
				return false;
			}
		},
		{ message: 'Inserisci un indirizzo che inizia con http:// o https://' }
	);

export const pillSourceSchema = z.object({
	label: z.string().trim().min(1, 'Dai un nome alla fonte').max(120, 'Massimo 120 caratteri'),
	url: safeUrl.optional().or(z.literal('').transform(() => undefined))
});

export const pillInputSchema = z.object({
	title: z
		.string()
		.trim()
		.min(3, 'Il titolo deve avere almeno 3 caratteri')
		.max(140, 'Massimo 140 caratteri'),
	body: z
		.string()
		.trim()
		.min(10, 'Scrivi almeno 10 caratteri')
		.max(20_000, 'La pillola è troppo lunga (massimo 20.000 caratteri)'),
	format: z.enum(['text', 'latex']).default('text'),
	categoryId: z.enum(CATEGORY_IDS as [string, ...string[]], {
		error: 'Scegli una categoria'
	}),
	sources: z.array(pillSourceSchema).max(10, 'Massimo 10 fonti').default([]),
	isPublic: z.boolean().default(false)
});

export type PillInput = z.infer<typeof pillInputSchema>;

/* --- Profilo --- */

const RESERVED_USERNAMES = new Set([
	'admin',
	'api',
	'auth',
	'root',
	'support',
	'pillole',
	'help',
	'login',
	'signup',
	'settings',
	'profilo',
	'feed',
	'libreria',
	'cerca',
	'new',
	'me'
]);

export const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, 'Almeno 3 caratteri')
	.max(24, 'Massimo 24 caratteri')
	.regex(/^[a-z0-9._]+$/, 'Solo lettere minuscole, numeri, punto e underscore')
	.regex(/^[a-z0-9]/, 'Deve iniziare con una lettera o un numero')
	.refine((v) => !RESERVED_USERNAMES.has(v), { message: 'Questo username è riservato' });

/** Minimo 14 anni: sotto quella soglia servono tutele che non possiamo garantire. */
export const birthDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa il formato AAAA-MM-GG')
	.refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Data non valida' })
	.refine((v) => computeAge(v) >= 14, { message: 'Devi avere almeno 14 anni per iscriverti' })
	.refine((v) => computeAge(v) <= 120, { message: 'Controlla la data di nascita' });

export function computeAge(birthDate: string | Date): number {
	const b = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
	const now = new Date();
	let age = now.getFullYear() - b.getFullYear();
	const m = now.getMonth() - b.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
	return age;
}

/**
 * OWASP A07: lunghezza prima di complessita'. Una passphrase lunga batte
 * "Pa$$w0rd" — quindi imponiamo 10 caratteri e blocchiamo solo i casi banali.
 */
export const passwordSchema = z
	.string()
	.min(10, 'Almeno 10 caratteri')
	.max(128, 'Massimo 128 caratteri')
	.refine((v) => !/^(.)\1+$/.test(v), { message: 'Troppo semplice' })
	.refine((v) => !/^(password|123456|qwerty|pillole)/i.test(v), {
		message: 'Questa password è troppo comune'
	});

export const signUpSchema = z.object({
	firstName: z.string().trim().min(1, 'Inserisci il nome').max(60),
	lastName: z.string().trim().min(1, 'Inserisci il cognome').max(60),
	username: usernameSchema,
	email: z.email('Email non valida').trim().toLowerCase().max(254),
	birthDate: birthDateSchema,
	password: passwordSchema
});

export const profileUpdateSchema = z.object({
	firstName: z.string().trim().min(1).max(60),
	lastName: z.string().trim().min(1).max(60),
	username: usernameSchema,
	birthDate: birthDateSchema,
	bio: z.string().trim().max(280, 'Massimo 280 caratteri').optional().default('')
});

/* --- Paginazione: limiti duri, il client non decide quanto lavoro fa il DB --- */
export const paginationSchema = z.object({
	cursor: z.iso.datetime().optional(),
	limit: z.coerce.number().int().min(1).max(30).default(12)
});

export const searchQuerySchema = z.object({
	q: z.string().trim().min(1).max(80),
	limit: z.coerce.number().int().min(1).max(30).default(15)
});

/** Riduce un `ZodError` a `{ campo: messaggio }`, pronto per i form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.join('.') || '_';
		if (!(key in out)) out[key] = issue.message;
	}
	return out;
}
