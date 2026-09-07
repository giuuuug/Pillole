import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import * as schema from './schema';

/**
 * Netlify DB (Neon) via driver HTTP, non TCP.
 *
 * Perche' HTTP: il piano free chiude la connessione dopo ~5 minuti di
 * inattivita' e il cold start di una connessione TCP e' lento. Il driver
 * `neon-http` e' stateless — ogni query e' una singola fetch, non c'e' un
 * pool da tenere vivo ne' da riaprire. Su Netlify Functions (lambda
 * effimere) e' anche l'unica scelta che non perda connessioni.
 *
 * Costo: niente transazioni interattive multi-statement. Dove serve
 * atomicita' si usa una singola query con CTE.
 */
let instance: NeonHttpDatabase<typeof schema> | null = null;

function connect(): NeonHttpDatabase<typeof schema> {
	// Netlify inietta `NETLIFY_DATABASE_URL` da solo quando il DB e' collegato.
	const connectionString = env.DATABASE_URL || env.NETLIFY_DATABASE_URL;

	if (!connectionString) {
		// Durante `vite build` nessuna query viene eseguita: SvelteKit importa
		// i moduli solo per analizzarli. Un segnaposto evita di dover esporre
		// le credenziali di produzione alla pipeline di build.
		if (building)
			return drizzle(neon('postgresql://build:build@localhost/build'), {
				schema,
				casing: 'snake_case'
			});

		throw new Error(
			'DATABASE_URL non configurata. Copia .env.example in .env e imposta la stringa di connessione.'
		);
	}

	return drizzle(neon(connectionString), { schema, casing: 'snake_case' });
}

/**
 * Inizializzazione pigra: la connessione si crea alla prima query, non
 * all'import. Cosi' `vite build` non ha bisogno delle variabili d'ambiente
 * di produzione, e un env mancante si manifesta come errore chiaro a
 * runtime invece che come build rotta.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
	get(_target, prop, receiver) {
		instance ??= connect();
		return Reflect.get(instance, prop, receiver);
	}
});

export { schema };
