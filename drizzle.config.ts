import { defineConfig } from 'drizzle-kit';

/**
 * Per le migrazioni usiamo la connessione DIRETTA (unpooled), non quella
 * con pgbouncer davanti: il DDL di una migrazione va eseguito su una
 * sessione unica e stabile, non attraverso un pool pensato per tante
 * query brevi e concorrenti.
 *
 * Netlify DB (Neon) espone entrambe le stringhe come variabili separate;
 * qui si preferisce quella "_UNPOOLED" quando esiste, altrimenti si
 * ricade su quella normale (comodo in locale, dove spesso c'e' una sola
 * DATABASE_URL).
 *
 * `db:generate` non tocca affatto il database: legge lo schema e scrive
 * l'SQL, quindi il segnaposto qui sotto evita di dover esportare una vera
 * DATABASE_URL solo per generare una migrazione.
 */
const url =
	process.env.DATABASE_URL_UNPOOLED ??
	process.env.NETLIFY_DATABASE_URL_UNPOOLED ??
	process.env.DATABASE_URL ??
	process.env.NETLIFY_DATABASE_URL ??
	'';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder' },
	verbose: true,
	strict: true
});
