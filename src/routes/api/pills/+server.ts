import { json } from '@sveltejs/kit';
import { pillInputSchema } from '$lib/domain/validation';
import { canPublish, rateLimit, readJson, requireUser } from '$lib/server/guards';
import { createPill } from '$lib/server/services/pill-service';
import type { RequestHandler } from './$types';

/** Crea una pillola. */
export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	rateLimit(event, { key: 'pill:create', max: 20, windowMs: 60_000 });

	const input = await readJson(event, pillInputSchema);
	const { id } = await createPill(user.id, input, canPublish(user));

	return json(
		{
			id,
			// Se ha chiesto di pubblicare ma non puo', lo diciamo esplicitamente.
			published: input.isPublic && canPublish(user),
			needsVerification: input.isPublic && !canPublish(user)
		},
		{ status: 201 }
	);
};
