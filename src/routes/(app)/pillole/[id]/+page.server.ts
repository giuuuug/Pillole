import { getPill } from '$lib/server/services/pill-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	const pill = await getPill(params.id, locals.user?.id ?? null);

	// `no-store` sempre: anche per una pillola pubblica, `isSaved`/`isFavorite`
	// dipendono da chi guarda — una cache del browser mostrerebbe lo stato
	// di salva/preferita non aggiornato dopo un'azione.
	setHeaders({ 'cache-control': 'private, no-store' });

	return { pill };
};
