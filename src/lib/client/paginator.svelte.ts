import { toast } from './toast.svelte';

type Page<T> = { items: T[]; nextCursor: string | null };

/**
 * Paginazione a cursore per il feed e la libreria.
 *
 * Perche' cursore e non pagina numerata: `OFFSET 500` su Postgres rilegge
 * comunque le 500 righe saltate. Con il cursore ogni pagina costa uguale.
 *
 * La prima pagina arriva gia' renderizzata dal server (`+page.server.ts`),
 * quindi il primo schermo non fa nessuna fetch: qui gestiamo solo il "dopo".
 */
export class Paginator<T> {
	items = $state<T[]>([]);
	cursor = $state<string | null>(null);
	loading = $state(false);
	exhausted = $derived(this.cursor === null);

	/**
	 * Indice da cui parte l'ultimo blocco caricato con `loadMore()`. Serve
	 * solo a chi vuole animare l'ingresso delle nuove card (feed): la prima
	 * pagina, gia' renderizzata dal server, non deve animarsi.
	 */
	lastBatchStart = $state(0);

	#endpoint: string;
	#params: () => Record<string, string | undefined>;
	#inFlight: AbortController | null = null;

	constructor(
		endpoint: string,
		params: () => Record<string, string | undefined>,
		initial: Page<T>
	) {
		this.#endpoint = endpoint;
		this.#params = params;
		this.items = initial.items;
		this.cursor = initial.nextCursor;
		this.lastBatchStart = initial.items.length;
	}

	/** Rimpiazza i dati (cambio filtro): la prima pagina arriva dal server. */
	reset(page: Page<T>) {
		this.#inFlight?.abort();
		this.items = page.items;
		this.cursor = page.nextCursor;
		this.loading = false;
		this.lastBatchStart = page.items.length;
	}

	async loadMore() {
		if (this.loading || this.cursor === null) return;

		this.loading = true;
		// Una sola richiesta viva alla volta: se l'utente cambia filtro mentre
		// scorre, la vecchia viene annullata invece di sovrascrivere la nuova.
		this.#inFlight?.abort();
		const controller = new AbortController();
		this.#inFlight = controller;

		const query = new URLSearchParams({ cursor: this.cursor });
		for (const [key, value] of Object.entries(this.#params())) {
			if (value) query.set(key, value);
		}

		try {
			const res = await fetch(`${this.#endpoint}?${query}`, { signal: controller.signal });
			if (!res.ok) throw new Error(String(res.status));

			const page = (await res.json()) as Page<T>;
			this.lastBatchStart = this.items.length;
			this.items = [...this.items, ...page.items];
			this.cursor = page.nextCursor;
		} catch (err) {
			if ((err as Error).name === 'AbortError') return;
			toast.error('Non è stato possibile caricare altre pillole.');
		} finally {
			if (this.#inFlight === controller) {
				this.loading = false;
				this.#inFlight = null;
			}
		}
	}
}

/**
 * Azione Svelte: chiama `onVisible` quando la sentinella entra nel viewport.
 * `rootMargin` anticipa il caricamento di uno schermo, cosi' l'utente non
 * vede quasi mai lo spinner.
 */
export function infiniteScroll(node: HTMLElement, onVisible: () => void) {
	let callback = onVisible;

	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting) callback();
		},
		{ rootMargin: '600px 0px' }
	);
	observer.observe(node);

	return {
		update(next: () => void) {
			callback = next;
		},
		destroy() {
			observer.disconnect();
		}
	};
}
