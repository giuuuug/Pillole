import { redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import type { AppUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

type Stats = {
	total: number;
	published: number;
	saved: number;
	followers: number;
	following: number;
};

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	if (!locals.user) {
		redirect(303, `/accedi?next=${encodeURIComponent(url.pathname)}`);
	}

	const me = locals.user as AppUser;

	// Tutti i contatori in un solo giro verso il database: cinque sottoquery
	// in una query sola invece di cinque round-trip su una connessione lenta.
	const result = await db.execute<Stats>(sql`
		select
			(select count(*)::int from "pill" where author_id = ${me.id}) as total,
			(select count(*)::int from "pill" where author_id = ${me.id} and is_public = true) as published,
			(select count(*)::int from "saved_pill" where user_id = ${me.id}) as saved,
			(select count(*)::int from "follow" where following_id = ${me.id}) as followers,
			(select count(*)::int from "follow" where follower_id = ${me.id}) as following
	`);

	const rows = (Array.isArray(result) ? result : result.rows) as Stats[];
	const stats = rows[0] ?? { total: 0, published: 0, saved: 0, followers: 0, following: 0 };

	// Non è un additionalField di Better Auth (vedi schema.ts): va letto a
	// parte, non arriva con la sessione.
	const [row] = await db
		.select({ badge: userTable.badge })
		.from(userTable)
		.where(eq(userTable.id, me.id))
		.limit(1);

	setHeaders({ 'cache-control': 'private, no-store' });

	return {
		profile: {
			firstName: me.firstName ?? '',
			lastName: me.lastName ?? '',
			username: me.username ?? null,
			birthDate: me.birthDate ?? null,
			bio: me.bio ?? null,
			badge: row?.badge ?? null
		},
		stats
	};
};
