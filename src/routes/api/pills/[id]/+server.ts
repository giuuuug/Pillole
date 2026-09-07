import { json } from '@sveltejs/kit';
import { pillInputSchema } from '$lib/domain/validation';
import { canPublish, readJson, requireUser } from '$lib/server/guards';
import { deletePill, updatePill } from '$lib/server/services/pill-service';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const input = await readJson(event, pillInputSchema);

	await updatePill(event.params.id, user.id, input, canPublish(user));

	return json({
		ok: true,
		published: input.isPublic && canPublish(user),
		needsVerification: input.isPublic && !canPublish(user)
	});
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	await deletePill(event.params.id, user.id);
	return new Response(null, { status: 204 });
};
