import * as devalue from 'devalue';
import type { ApiClient } from './client';

/**
 * Non esiste un `GET /api/pills/:id` — il dettaglio di una pillola si legge
 * solo dalla pagina `/pillole/[id]` (vedi +page.server.ts, che chiama lo
 * stesso `getPill()` usato altrove). SvelteKit espone per ogni pagina un
 * endpoint `__data.json` — lo stesso che il browser usa per la navigazione
 * client-side — che qui si decodifica con `devalue` (la libreria che
 * SvelteKit stesso usa per serializzare i dati del load).
 *
 * La risposta HTTP di __data.json è SEMPRE 200: un `error(404, ...)` dentro
 * al load diventa un nodo `{type:'error', status:404, error:{message}}`
 * dentro al JSON, non uno status HTTP diverso. `fetchPageData` lo riflette
 * nel campo `status` restituito.
 */
export async function fetchPageData<T = Record<string, unknown>>(
	api: ApiClient,
	pathname: string
): Promise<{ status: number; data: T | null; errorMessage: string | null }> {
	const res = await api.get(`${pathname}/__data.json`);
	if (!res.ok) {
		return { status: res.status, data: null, errorMessage: `__data.json HTTP ${res.status}` };
	}

	const parsed = await api.json<{ type: string; nodes: unknown[] }>(res);
	const merged: Record<string, unknown> = {};
	let errorNode: { status?: number; error?: { message?: string } } | null = null;

	for (const node of parsed.nodes) {
		if (!node || typeof node !== 'object') continue;
		const n = node as {
			type?: string;
			data?: unknown;
			status?: number;
			error?: { message?: string };
		};
		if (n.type === 'error') {
			errorNode = n;
		} else if (n.type === 'data' && n.data !== undefined) {
			const obj = devalue.unflatten(n.data as number | unknown[]) as Record<string, unknown>;
			Object.assign(merged, obj);
		}
	}

	if (errorNode) {
		return {
			status: errorNode.status ?? 500,
			data: null,
			errorMessage: errorNode.error?.message ?? null
		};
	}
	return { status: 200, data: merged as T, errorMessage: null };
}

export type PillDetailData = {
	id: string;
	title: string;
	body: string;
	excerpt: string;
	format: string;
	categoryId: string;
	isPublic: boolean;
	isFavorite: boolean;
	saveCount: number;
	isSaved: boolean;
	isMine: boolean;
	sources: { label: string; url?: string }[];
	author: { id: string; username: string | null; name: string };
};

export async function fetchPill(api: ApiClient, id: string) {
	const result = await fetchPageData<{ pill: PillDetailData }>(api, `/pillole/${id}`);
	return {
		status: result.status,
		pill: result.data?.pill ?? null,
		errorMessage: result.errorMessage
	};
}
