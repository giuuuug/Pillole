import { and, desc, eq, getTableName, ne, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '../db';
import { follow, pill, user } from '../db/schema';

/**
 * ATTENZIONE: quando la query esterna tocca una sola tabella (qui `user`,
 * senza join), Drizzle non qualifica i nomi colonna nemmeno dentro un
 * frammento `sql` annidato — `${user.id}` diventa il bare `"id"`. Dentro una
 * subquery correlata su `pill` (che ha una sua colonna `id`), quel `"id"`
 * risolve alla `pill.id` locale invece che all'`user.id` esterno voluto,
 * azzerando il conteggio (`pill.author_id = pill.id` è quasi sempre falso).
 * Verificato con `.toSQL()`: qualificare a mano risolve; `getConnections`
 * qui sotto non ha il problema perché la sua query esterna già tocca due
 * tabelle (`follow` + `user`), e li' Drizzle qualifica tutto da solo.
 * Vedi CLAUDE.md, trappola #15.
 */
const qualifiedUserId = sql.raw(`"${getTableName(user)}"."id"`);

export type PublicProfile = {
	id: string;
	username: string | null;
	name: string;
	image: string | null;
	bio: string | null;
	memberSince: string;
	pillCount: number;
	followerCount: number;
	followingCount: number;
	isFollowedByViewer: boolean;
	isSelf: boolean;
};

export type UserCard = {
	id: string;
	username: string | null;
	name: string;
	image: string | null;
	bio: string | null;
	pillCount: number;
	isFollowedByViewer: boolean;
};

/**
 * Profilo pubblico completo in UNA sola query: i tre contatori sono
 * sottoquery correlate, non tre round-trip separati. Su Netlify DB ogni
 * round-trip in piu' e' latenza che l'utente sente.
 */
export async function getProfileByUsername(
	username: string,
	viewerId: string | null
): Promise<PublicProfile> {
	const [row] = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			bio: user.bio,
			memberSince: user.createdAt,
			pillCount: sql<number>`(
				select count(*)::int from ${pill}
				where ${pill.authorId} = ${qualifiedUserId} and ${pill.isPublic} = true
			)`,
			followerCount: sql<number>`(
				select count(*)::int from ${follow} where ${follow.followingId} = ${user.id}
			)`,
			followingCount: sql<number>`(
				select count(*)::int from ${follow} where ${follow.followerId} = ${user.id}
			)`,
			isFollowedByViewer: viewerId
				? sql<boolean>`exists (
					select 1 from ${follow}
					where ${follow.followerId} = ${viewerId} and ${follow.followingId} = ${user.id}
				)`
				: sql<boolean>`false`
		})
		.from(user)
		.where(sql`lower(${user.username}) = lower(${username})`)
		.limit(1);

	if (!row) error(404, 'Profilo non trovato');

	return {
		...row,
		memberSince: row.memberSince.toISOString(),
		isSelf: row.id === viewerId
	};
}

/**
 * Ricerca per username o nome. Prefix-match su `lower(username)`, che sfrutta
 * l'indice unico dichiarato nello schema; il fallback sul nome usa ILIKE ma
 * solo con prefisso, non `%...%`.
 */
export async function searchUsers(opts: {
	q: string;
	viewerId: string | null;
	limit: number;
}): Promise<UserCard[]> {
	const { q, viewerId, limit } = opts;
	// L'utente puo' digitare "@mario": lo togliamo prima di cercare.
	const term = q.replace(/^@/, '').toLowerCase();
	const prefix = `${term}%`;

	const rows = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			bio: user.bio,
			pillCount: sql<number>`(
				select count(*)::int from ${pill}
				where ${pill.authorId} = ${qualifiedUserId} and ${pill.isPublic} = true
			)`,
			isFollowedByViewer: viewerId
				? sql<boolean>`exists (
					select 1 from ${follow}
					where ${follow.followerId} = ${viewerId} and ${follow.followingId} = ${user.id}
				)`
				: sql<boolean>`false`,
			// Chi corrisponde per username sta sopra a chi corrisponde per nome.
			priority: sql<number>`case when lower(${user.username}) like ${prefix} then 0 else 1 end`
		})
		.from(user)
		.where(
			and(
				sql`${user.username} is not null`,
				sql`(lower(${user.username}) like ${prefix} or ${user.name} ilike ${prefix})`,
				viewerId ? ne(user.id, viewerId) : undefined
			)
		)
		.orderBy(sql`case when lower(${user.username}) like ${prefix} then 0 else 1 end`, user.username)
		.limit(limit);

	return rows.map(({ priority: _priority, ...rest }) => rest);
}

export async function followUser(followerId: string, targetUsername: string): Promise<void> {
	const [target] = await db
		.select({ id: user.id })
		.from(user)
		.where(sql`lower(${user.username}) = lower(${targetUsername})`)
		.limit(1);

	if (!target) error(404, 'Profilo non trovato');
	if (target.id === followerId) error(400, 'Non puoi seguire te stesso');

	await db.insert(follow).values({ followerId, followingId: target.id }).onConflictDoNothing();
}

export async function unfollowUser(followerId: string, targetUsername: string): Promise<void> {
	const [target] = await db
		.select({ id: user.id })
		.from(user)
		.where(sql`lower(${user.username}) = lower(${targetUsername})`)
		.limit(1);

	if (!target) error(404, 'Profilo non trovato');

	await db
		.delete(follow)
		.where(and(eq(follow.followerId, followerId), eq(follow.followingId, target.id)));
}

/** Elenco follower / seguiti di un profilo. */
export async function getConnections(opts: {
	username: string;
	direction: 'followers' | 'following';
	viewerId: string | null;
	limit: number;
}): Promise<UserCard[]> {
	const { username, direction, viewerId, limit } = opts;

	const [target] = await db
		.select({ id: user.id })
		.from(user)
		.where(sql`lower(${user.username}) = lower(${username})`)
		.limit(1);

	if (!target) error(404, 'Profilo non trovato');

	const joinOn =
		direction === 'followers'
			? and(eq(follow.followingId, target.id), eq(user.id, follow.followerId))
			: and(eq(follow.followerId, target.id), eq(user.id, follow.followingId));

	const rows = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			bio: user.bio,
			pillCount: sql<number>`(
				select count(*)::int from ${pill}
				where ${pill.authorId} = ${user.id} and ${pill.isPublic} = true
			)`,
			isFollowedByViewer: viewerId
				? sql<boolean>`exists (
					select 1 from ${follow} f2
					where f2.follower_id = ${viewerId} and f2.following_id = ${user.id}
				)`
				: sql<boolean>`false`
		})
		.from(follow)
		.innerJoin(user, joinOn!)
		.orderBy(desc(follow.createdAt))
		.limit(limit);

	return rows;
}

/** Suggerimenti per il feed vuoto: chi pubblica di piu' e non segui gia'. */
export async function getSuggestedUsers(viewerId: string, limit = 5): Promise<UserCard[]> {
	return db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			bio: user.bio,
			pillCount: sql<number>`count(${pill.id})::int`,
			isFollowedByViewer: sql<boolean>`false`
		})
		.from(user)
		.innerJoin(pill, and(eq(pill.authorId, user.id), eq(pill.isPublic, true)))
		.where(
			and(
				ne(user.id, viewerId),
				sql`${user.username} is not null`,
				sql`not exists (
					select 1 from ${follow}
					where ${follow.followerId} = ${viewerId} and ${follow.followingId} = ${user.id}
				)`
			)
		)
		.groupBy(user.id)
		.orderBy(desc(sql`count(${pill.id})`))
		.limit(limit);
}
