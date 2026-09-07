import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

/* ============================================================
   AUTH — tabelle richieste da Better Auth (+ campi profilo)
   ============================================================ */

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),

		// --- campi profilo PILLOLE ---
		username: varchar('username', { length: 30 }).unique(),
		displayUsername: varchar('display_username', { length: 30 }),
		firstName: varchar('first_name', { length: 60 }),
		lastName: varchar('last_name', { length: 60 }),
		birthDate: date('birth_date'),
		bio: varchar('bio', { length: 280 }),
		/**
		 * Badge accanto al nome (es. 'gold' per il superuser/admin). Non e' un
		 * additionalField di Better Auth: e' gestito SOLO da chi ha accesso
		 * diretto al database (nessun endpoint lo scrive), cosi' un utente non
		 * puo' assegnarselo da solo tramite l'update del profilo. Valori validi
		 * in `src/lib/domain/badges.ts`.
		 */
		badge: varchar('badge', { length: 20 }),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		// Ricerca per username case-insensitive senza scansione completa.
		uniqueIndex('user_username_lower_idx').on(sql`lower(${t.username})`),
		index('user_created_at_idx').on(t.createdAt)
	]
);

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('session_user_id_idx').on(t.userId),
		index('session_expires_at_idx').on(t.expiresAt)
	]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		/**
		 * Better Auth >= 1.7 identifica un account con (issuer, accountId),
		 * non piu' con (providerId, accountId): l'issuer separa i metodi
		 * locali (`local:credential`) dagli OAuth (`local:oauth:google`),
		 * cosi' un providerId non puo' collidere con un metodo interno.
		 */
		issuer: text('issuer').notNull(),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		idToken: text('id_token'),
		password: text('password'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('account_user_id_idx').on(t.userId),
		uniqueIndex('account_issuer_idx').on(t.issuer, t.accountId)
	]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('verification_identifier_idx').on(t.identifier)]
);

/* ============================================================
   DOMINIO — categorie, pillole, social
   ============================================================ */

export const category = pgTable('category', {
	id: varchar('id', { length: 40 }).primaryKey(), // slug: 'matematica', 'fisica', ...
	label: varchar('label', { length: 60 }).notNull(),
	description: varchar('description', { length: 160 }),
	icon: varchar('icon', { length: 40 }).notNull(),
	// Coppia colore accessibile (fill + testo sopra), validata a 4.5:1.
	color: varchar('color', { length: 9 }).notNull(),
	onColor: varchar('on_color', { length: 9 }).notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

/** Una fonte citata dentro una pillola. */
export type PillSource = { label: string; url?: string };

export const pill = pgTable(
	'pill',
	{
		id: text('id').primaryKey(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		categoryId: varchar('category_id', { length: 40 })
			.notNull()
			.references(() => category.id, { onDelete: 'restrict' }),

		title: varchar('title', { length: 140 }).notNull(),
		body: text('body').notNull(),
		/** 'text' = markdown leggero | 'latex' = corpo con blocchi $...$ e $$...$$ */
		format: varchar('format', { length: 10 }).notNull().default('text'),
		sources: jsonb('sources')
			.$type<PillSource[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),

		/** Privata per default: si pubblica solo con un'azione esplicita. */
		isPublic: boolean('is_public').notNull().default(false),
		publishedAt: timestamp('published_at', { withTimezone: true }),

		isFavorite: boolean('is_favorite').notNull().default(false),
		saveCount: integer('save_count').notNull().default(0),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		// Libreria personale: pillole di un autore, piu' recenti prima.
		index('pill_author_created_idx').on(t.authorId, t.createdAt.desc()),
		// Scaffale: pillole di un autore in una categoria.
		index('pill_author_category_idx').on(t.authorId, t.categoryId),
		// Feed globale: solo le pubbliche, ordinate per pubblicazione.
		index('pill_public_published_idx')
			.on(t.publishedAt.desc())
			.where(sql`${t.isPublic} = true`),
		// Feed "seguiti": autore + data, filtrato sulle pubbliche.
		index('pill_public_author_idx')
			.on(t.authorId, t.publishedAt.desc())
			.where(sql`${t.isPublic} = true`),
		// Ricerca full-text italiana su titolo + corpo.
		index('pill_search_idx').using(
			'gin',
			sql`to_tsvector('italian', ${t.title} || ' ' || ${t.body})`
		)
	]
);

/** Chi segue chi. */
export const follow = pgTable(
	'follow',
	{
		followerId: text('follower_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		followingId: text('following_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.followerId, t.followingId] }),
		index('follow_following_idx').on(t.followingId),
		index('follow_follower_created_idx').on(t.followerId, t.createdAt.desc())
	]
);

/**
 * Pillola altrui salvata nella propria libreria.
 * Riferimento, non copia: l'attribuzione all'autore resta sempre corretta
 * e un aggiornamento dell'autore si riflette su chi l'ha salvata.
 */
export const savedPill = pgTable(
	'saved_pill',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		pillId: text('pill_id')
			.notNull()
			.references(() => pill.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.pillId] }),
		index('saved_pill_user_created_idx').on(t.userId, t.createdAt.desc()),
		index('saved_pill_pill_idx').on(t.pillId)
	]
);

/* ============================================================
   RELAZIONI
   ============================================================ */

export const userRelations = relations(user, ({ many }) => ({
	pills: many(pill),
	saved: many(savedPill)
}));

export const pillRelations = relations(pill, ({ one, many }) => ({
	author: one(user, { fields: [pill.authorId], references: [user.id] }),
	category: one(category, { fields: [pill.categoryId], references: [category.id] }),
	savedBy: many(savedPill)
}));

export const savedPillRelations = relations(savedPill, ({ one }) => ({
	user: one(user, { fields: [savedPill.userId], references: [user.id] }),
	pill: one(pill, { fields: [savedPill.pillId], references: [pill.id] })
}));

export type User = typeof user.$inferSelect;
export type Pill = typeof pill.$inferSelect;
export type NewPill = typeof pill.$inferInsert;
export type Category = typeof category.$inferSelect;
