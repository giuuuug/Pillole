import { and, eq, isNotNull } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/**
 * Sitemap generata a runtime, non un file statico: le pillole pubbliche e i
 * profili con username cambiano di continuo, un file in `static/` sarebbe
 * sempre disallineato. Cache-Control breve (non serve Redis, vedi CLAUDE.md
 * §1 "Vincoli") per non rigenerarla a ogni singolo crawl.
 */
export const GET: RequestHandler = async () => {
	const baseUrl = (env.BETTER_AUTH_URL || env.PUBLIC_APP_URL || 'https://pillole.me').replace(
		/\/$/,
		''
	);

	const [publicPills, publicUsers] = await Promise.all([
		db
			.select({ id: schema.pill.id, updatedAt: schema.pill.updatedAt })
			.from(schema.pill)
			.where(eq(schema.pill.isPublic, true)),
		db
			.select({ username: schema.user.username, updatedAt: schema.user.updatedAt })
			.from(schema.user)
			.where(and(isNotNull(schema.user.username), eq(schema.user.emailVerified, true)))
	]);

	const staticUrls = [
		{ loc: `${baseUrl}/`, priority: '1.0' },
		{ loc: `${baseUrl}/privacy`, priority: '0.3' },
		{ loc: `${baseUrl}/termini`, priority: '0.3' }
	];

	const pillUrls = publicPills.map((p) => ({
		loc: `${baseUrl}/pillole/${p.id}`,
		lastmod: p.updatedAt.toISOString(),
		priority: '0.7'
	}));

	const userUrls = publicUsers.map((u) => ({
		loc: `${baseUrl}/u/${u.username}`,
		lastmod: u.updatedAt.toISOString(),
		priority: '0.5'
	}));

	const entries = [...staticUrls, ...pillUrls, ...userUrls];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`	<url>\n\t\t<loc>${e.loc}</loc>\n${'lastmod' in e ? `\t\t<lastmod>${e.lastmod}</lastmod>\n` : ''}\t\t<priority>${e.priority}</priority>\n\t</url>`
	)
	.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
