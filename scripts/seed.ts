/**
 * Popola la tabella `category` con le categorie di serie.
 *
 * Idempotente: si puo' rilanciare dopo ogni deploy senza duplicare nulla e
 * senza sovrascrivere una descrizione modificata a mano — aggiorna solo i
 * campi che vengono dal codice.
 *
 *   node --experimental-strip-types scripts/seed.ts
 */
import { neon } from '@neondatabase/serverless';
import { CATEGORIES } from '../src/lib/domain/categories.ts';

const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL non configurata.');
	process.exit(1);
}

const sql = neon(url);

for (const c of CATEGORIES) {
	await sql`
		insert into "category" (id, label, description, icon, color, on_color, sort_order)
		values (${c.id}, ${c.label}, ${c.description}, ${c.icon}, ${c.color}, ${c.onColor}, ${c.sortOrder})
		on conflict (id) do update set
			label = excluded.label,
			description = excluded.description,
			icon = excluded.icon,
			color = excluded.color,
			on_color = excluded.on_color,
			sort_order = excluded.sort_order
	`;
}

console.log(`Seed completato: ${CATEGORIES.length} categorie.`);
