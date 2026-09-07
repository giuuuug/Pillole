import { and, desc, eq, exists, lt, or, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '../db';
import { follow, pill, savedPill, user } from '../db/schema';
import type { PillInput } from '$lib/domain/validation';
import type { PillSource } from '../db/schema';

export type PillCard = {
	id: string;
	title: string;
	excerpt: string;
	format: string;
	categoryId: string;
	isPublic: boolean;
	isFavorite: boolean;
	saveCount: number;
	createdAt: string;
	publishedAt: string | null;
	author: {
		id: string;
		username: string | null;
		name: string;
		image: string | null;
		badge: string | null;
	};
	/** true se la pillola e' stata salvata dall'utente che sta guardando. */
	isSaved: boolean;
	/** true se l'utente che guarda ne e' l'autore. */
	isMine: boolean;
};

export type PillDetail = PillCard & { body: string; sources: PillSource[] };

const EXCERPT_LEN = 180;

/** Colonne dell'autore: mai la email, mai la password, mai la data di nascita. */
const authorColumns = {
	id: user.id,
	username: user.username,
	name: user.name,
	image: user.image,
	badge: user.badge
};

/**
 * L'anteprima viene calcolata dal database, non trasferendo l'intero corpo:
 * una pillola puo' pesare 20 KB e in un feed da 12 sarebbero 240 KB inutili.
 */
const excerptExpr = sql<string>`left(regexp_replace(${pill.body}, '\\s+', ' ', 'g'), ${EXCERPT_LEN})`;

function savedExpr(viewerId: string | null) {
	if (!viewerId) return sql<boolean>`false`;
	return sql<boolean>`exists (
		select 1 from ${savedPill}
		where ${savedPill.pillId} = ${pill.id} and ${savedPill.userId} = ${viewerId}
	)`;
}

type Row = {
	id: string;
	title: string;
	excerpt: string;
	format: string;
	categoryId: string;
	isPublic: boolean;
	isFavorite: boolean;
	saveCount: number;
	createdAt: Date;
	publishedAt: Date | null;
	authorId: string;
	authorUsername: string | null;
	authorName: string;
	authorImage: string | null;
	authorBadge: string | null;
	isSaved: boolean;
};

function toCard(r: Row, viewerId: string | null): PillCard {
	return {
		id: r.id,
		title: r.title,
		excerpt: r.excerpt,
		format: r.format,
		categoryId: r.categoryId,
		isPublic: r.isPublic,
		isFavorite: r.isFavorite,
		saveCount: r.saveCount,
		createdAt: r.createdAt.toISOString(),
		publishedAt: r.publishedAt?.toISOString() ?? null,
		author: {
			id: r.authorId,
			username: r.authorUsername,
			name: r.authorName,
			image: r.authorImage,
			badge: r.authorBadge
		},
		isSaved: r.isSaved,
		isMine: r.authorId === viewerId
	};
}

const cardSelect = (viewerId: string | null) => ({
	id: pill.id,
	title: pill.title,
	excerpt: excerptExpr,
	format: pill.format,
	categoryId: pill.categoryId,
	isPublic: pill.isPublic,
	isFavorite: pill.isFavorite,
	saveCount: pill.saveCount,
	createdAt: pill.createdAt,
	publishedAt: pill.publishedAt,
	authorId: authorColumns.id,
	authorUsername: authorColumns.username,
	authorName: authorColumns.name,
	authorImage: authorColumns.image,
	authorBadge: authorColumns.badge,
	isSaved: savedExpr(viewerId)
});

export type Page<T> = { items: T[]; nextCursor: string | null };

function paginate<T extends { createdAt: string } | { publishedAt: string | null }>(
	items: T[],
	limit: number,
	key: 'createdAt' | 'publishedAt'
): Page<T> {
	const hasMore = items.length > limit;
	const page = hasMore ? items.slice(0, limit) : items;
	const last = page.at(-1) as Record<string, string | null> | undefined;
	return { items: page, nextCursor: hasMore && last ? (last[key] ?? null) : null };
}

/* ============================================================
   FEED
   ============================================================ */

/**
 * Feed pubblico. `scope: 'following'` restringe agli autori seguiti.
 * Una sola query, paginazione a cursore (niente OFFSET: su Neon un
 * OFFSET grande rilegge tutte le righe saltate).
 */
export async function getFeed(opts: {
	viewerId: string | null;
	scope: 'all' | 'following';
	categoryId?: string;
	cursor?: string;
	limit: number;
}): Promise<Page<PillCard>> {
	const { viewerId, scope, categoryId, cursor, limit } = opts;

	if (scope === 'following' && !viewerId) return { items: [], nextCursor: null };

	const conditions = [eq(pill.isPublic, true)];
	if (categoryId) conditions.push(eq(pill.categoryId, categoryId));
	if (cursor) conditions.push(lt(pill.publishedAt, new Date(cursor)));
	if (scope === 'following' && viewerId) {
		conditions.push(
			exists(
				db
					.select({ one: sql`1` })
					.from(follow)
					.where(and(eq(follow.followerId, viewerId), eq(follow.followingId, pill.authorId)))
			)
		);
	}

	const rows = await db
		.select(cardSelect(viewerId))
		.from(pill)
		.innerJoin(user, eq(user.id, pill.authorId))
		.where(and(...conditions))
		.orderBy(desc(pill.publishedAt))
		.limit(limit + 1);

	return paginate(
		rows.map((r) => toCard(r as Row, viewerId)),
		limit,
		'publishedAt'
	);
}

/* ============================================================
   LIBRERIA
   ============================================================ */

/**
 * La libreria dell'utente: le sue pillole e quelle salvate da altri,
 * unite in un'unica lista ordinata. Union in SQL invece di due query
 * + merge in JS: meno round-trip verso un DB con cold start lento.
 */
export async function getLibrary(opts: {
	viewerId: string;
	categoryId?: string;
	filter: 'all' | 'mine' | 'saved' | 'favorites';
	cursor?: string;
	limit: number;
}): Promise<Page<PillCard>> {
	const { viewerId, categoryId, filter, cursor, limit } = opts;

	// Una pillola salvata (non propria) conta solo finche' e' ancora pubblica:
	// se l'autore la rende privata deve sparire anche da chi l'aveva salvata,
	// titolo e anteprima inclusi — non solo dal suo dettaglio (audit §7 #1).
	const savedAndStillPublic = and(
		eq(pill.isPublic, true),
		exists(
			db
				.select({ one: sql`1` })
				.from(savedPill)
				.where(and(eq(savedPill.userId, viewerId), eq(savedPill.pillId, pill.id)))
		)
	);

	const ownership =
		filter === 'mine'
			? eq(pill.authorId, viewerId)
			: filter === 'saved'
				? savedAndStillPublic
				: or(eq(pill.authorId, viewerId), savedAndStillPublic);

	const conditions = [ownership!];
	if (categoryId) conditions.push(eq(pill.categoryId, categoryId));
	if (filter === 'favorites')
		conditions.push(and(eq(pill.isFavorite, true), eq(pill.authorId, viewerId))!);
	if (cursor) conditions.push(lt(pill.createdAt, new Date(cursor)));

	const rows = await db
		.select(cardSelect(viewerId))
		.from(pill)
		.innerJoin(user, eq(user.id, pill.authorId))
		.where(and(...conditions))
		.orderBy(desc(pill.createdAt))
		.limit(limit + 1);

	return paginate(
		rows.map((r) => toCard(r as Row, viewerId)),
		limit,
		'createdAt'
	);
}

/** Conteggio pillole per categoria: alimenta gli "scaffali" della libreria. */
export async function getShelfCounts(viewerId: string): Promise<Record<string, number>> {
	const rows = await db
		.select({ categoryId: pill.categoryId, n: sql<number>`count(*)::int` })
		.from(pill)
		.where(
			or(
				eq(pill.authorId, viewerId),
				and(
					eq(pill.isPublic, true),
					exists(
						db
							.select({ one: sql`1` })
							.from(savedPill)
							.where(and(eq(savedPill.userId, viewerId), eq(savedPill.pillId, pill.id)))
					)
				)
			)
		)
		.groupBy(pill.categoryId);

	return Object.fromEntries(rows.map((r) => [r.categoryId, r.n]));
}

/* ============================================================
   DETTAGLIO / CRUD
   ============================================================ */

/**
 * OWASP A01 — Broken Access Control.
 * Il controllo di autorizzazione e' DENTRO la query: una pillola privata
 * di qualcun altro non viene proprio letta dal database.
 */
export async function getPill(id: string, viewerId: string | null): Promise<PillDetail> {
	const [row] = await db
		.select({ ...cardSelect(viewerId), body: pill.body, sources: pill.sources })
		.from(pill)
		.innerJoin(user, eq(user.id, pill.authorId))
		.where(
			and(
				eq(pill.id, id),
				viewerId
					? or(eq(pill.isPublic, true), eq(pill.authorId, viewerId))
					: eq(pill.isPublic, true)
			)
		)
		.limit(1);

	// 404 anche quando la pillola esiste ma non e' tua: non confermiamo
	// l'esistenza di contenuti privati altrui.
	if (!row) error(404, 'Pillola non trovata');

	return {
		...toCard(row as Row, viewerId),
		body: row.body,
		sources: (row.sources ?? []) as PillSource[]
	};
}

export async function createPill(
	authorId: string,
	input: PillInput,
	canPublish: boolean
): Promise<{ id: string }> {
	const isPublic = input.isPublic && canPublish;
	const id = crypto.randomUUID();

	await db.insert(pill).values({
		id,
		authorId,
		title: input.title,
		body: input.body,
		format: input.format,
		categoryId: input.categoryId,
		sources: input.sources as PillSource[],
		isPublic,
		publishedAt: isPublic ? new Date() : null
	});

	return { id };
}

export async function updatePill(
	id: string,
	authorId: string,
	input: PillInput,
	canPublish: boolean
): Promise<void> {
	const isPublic = input.isPublic && canPublish;

	const updated = await db
		.update(pill)
		.set({
			title: input.title,
			body: input.body,
			format: input.format,
			categoryId: input.categoryId,
			sources: input.sources as PillSource[],
			isPublic,
			// Se era gia' pubblica manteniamo la data originale di pubblicazione.
			publishedAt: isPublic ? sql`coalesce(${pill.publishedAt}, now())` : null,
			updatedAt: new Date()
		})
		// `authorId` nella WHERE: l'autorizzazione non e' un `if` che si puo' dimenticare.
		.where(and(eq(pill.id, id), eq(pill.authorId, authorId)))
		.returning({ id: pill.id });

	if (updated.length === 0) error(404, 'Pillola non trovata');
}

export async function deletePill(id: string, authorId: string): Promise<void> {
	const deleted = await db
		.delete(pill)
		.where(and(eq(pill.id, id), eq(pill.authorId, authorId)))
		.returning({ id: pill.id });

	if (deleted.length === 0) error(404, 'Pillola non trovata');
}

export async function toggleFavorite(id: string, authorId: string): Promise<boolean> {
	const [row] = await db
		.update(pill)
		.set({ isFavorite: sql`not ${pill.isFavorite}` })
		.where(and(eq(pill.id, id), eq(pill.authorId, authorId)))
		.returning({ isFavorite: pill.isFavorite });

	if (!row) error(404, 'Pillola non trovata');
	return row.isFavorite;
}

/* ============================================================
   SALVATAGGIO IN LIBRERIA
   ============================================================ */

/**
 * Salva una pillola pubblica altrui. Non copiamo il contenuto: teniamo un
 * riferimento, cosi' l'attribuzione all'autore resta corretta per sempre.
 */
export async function savePillToLibrary(pillId: string, userId: string): Promise<number> {
	const [target] = await db
		.select({ authorId: pill.authorId })
		.from(pill)
		.where(and(eq(pill.id, pillId), eq(pill.isPublic, true)))
		.limit(1);

	if (!target) error(404, 'Pillola non trovata');
	if (target.authorId === userId) error(400, 'Questa pillola è già tua');

	const inserted = await db
		.insert(savedPill)
		.values({ pillId, userId })
		.onConflictDoNothing()
		.returning({ pillId: savedPill.pillId });

	if (inserted.length > 0) {
		const [row] = await db
			.update(pill)
			.set({ saveCount: sql`${pill.saveCount} + 1` })
			.where(eq(pill.id, pillId))
			.returning({ saveCount: pill.saveCount });
		return row.saveCount;
	}

	const [row] = await db
		.select({ saveCount: pill.saveCount })
		.from(pill)
		.where(eq(pill.id, pillId));
	return row?.saveCount ?? 0;
}

export async function unsavePillFromLibrary(pillId: string, userId: string): Promise<number> {
	const removed = await db
		.delete(savedPill)
		.where(and(eq(savedPill.pillId, pillId), eq(savedPill.userId, userId)))
		.returning({ pillId: savedPill.pillId });

	if (removed.length === 0) {
		const [row] = await db
			.select({ saveCount: pill.saveCount })
			.from(pill)
			.where(eq(pill.id, pillId));
		return row?.saveCount ?? 0;
	}

	const [row] = await db
		.update(pill)
		// `greatest(...,0)`: il contatore non puo' andare sotto zero nemmeno
		// con due richieste concorrenti.
		.set({ saveCount: sql`greatest(${pill.saveCount} - 1, 0)` })
		.where(eq(pill.id, pillId))
		.returning({ saveCount: pill.saveCount });

	return row?.saveCount ?? 0;
}

/* ============================================================
   RICERCA
   ============================================================ */

/**
 * Ricerca full-text sulle pillole visibili all'utente (pubbliche + proprie).
 * Usa l'indice GIN dichiarato nello schema: niente `ILIKE '%...%'`, che
 * su Postgres non puo' usare indici e degrada linearmente.
 */
export async function searchPills(opts: {
	viewerId: string | null;
	q: string;
	limit: number;
}): Promise<PillCard[]> {
	const { viewerId, q, limit } = opts;
	const tsQuery = sql`websearch_to_tsquery('italian', ${q})`;
	const document = sql`to_tsvector('italian', ${pill.title} || ' ' || ${pill.body})`;

	const visibility = viewerId
		? or(eq(pill.isPublic, true), eq(pill.authorId, viewerId))!
		: eq(pill.isPublic, true);

	const rows = await db
		.select({ ...cardSelect(viewerId), rank: sql<number>`ts_rank(${document}, ${tsQuery})` })
		.from(pill)
		.innerJoin(user, eq(user.id, pill.authorId))
		.where(and(visibility, sql`${document} @@ ${tsQuery}`))
		.orderBy(desc(sql`ts_rank(${document}, ${tsQuery})`), desc(pill.createdAt))
		.limit(limit);

	return rows.map((r) => toCard(r as Row, viewerId));
}

/** Pillole pubbliche di un profilo (pagina @username). */
export async function getPublicPillsByAuthor(opts: {
	authorId: string;
	viewerId: string | null;
	cursor?: string;
	limit: number;
}): Promise<Page<PillCard>> {
	const { authorId, viewerId, cursor, limit } = opts;
	const conditions = [eq(pill.authorId, authorId), eq(pill.isPublic, true)];
	if (cursor) conditions.push(lt(pill.publishedAt, new Date(cursor)));

	const rows = await db
		.select(cardSelect(viewerId))
		.from(pill)
		.innerJoin(user, eq(user.id, pill.authorId))
		.where(and(...conditions))
		.orderBy(desc(pill.publishedAt))
		.limit(limit + 1);

	return paginate(
		rows.map((r) => toCard(r as Row, viewerId)),
		limit,
		'publishedAt'
	);
}
