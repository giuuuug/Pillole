import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// Il prefisso `_` marca cio' che si scarta di proposito (destructuring
			// con rest, indici di ciclo non usati): non e' codice dimenticato.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],
			// Nuova con eslint-plugin-svelte 3 (aggiornato il 5 set 2026): chiede
			// di avvolgere ogni `href` in `resolve()`, la funzione di SvelteKit per
			// le rotte tipizzate — una funzionalita' che qui non e' attiva
			// (`kit.typedRoutes` non e' configurato in svelte.config.js). Adottarla
			// vorrebbe dire riscrivere ~70 link in tutto il progetto per un
			// beneficio che, senza le rotte tipizzate, non esiste ancora: fuori
			// scopo per una pulizia del codice. Da riconsiderare se si attivano le
			// rotte tipizzate.
			'svelte/no-navigation-without-resolve': 'off',
			// Anche questa da eslint-plugin-svelte 3: propone SvelteURLSearchParams
			// ovunque si veda `new URLSearchParams(...)`, ma nei casi qui è sempre
			// una variabile locale a una funzione, costruita e buttata via subito
			// (mai messa in $state) — nessuna reattivita' da tracciare, quindi
			// nessun beneficio reale, solo un import in più.
			'svelte/prefer-svelte-reactivity': 'off'
		}
	},
	{
		// `.svelte.ts`/`.svelte.js` (rune fuori da un componente, es.
		// paginator.svelte.ts) hanno bisogno dello stesso parser TS dei
		// componenti .svelte, altrimenti eslint-plugin-svelte 3 non riconosce
		// la sintassi TypeScript "semplice" (es. `type Foo = ...`) al loro interno.
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{ ignores: ['build/', '.svelte-kit/', 'dist/', '.netlify/', 'drizzle/'] }
);
