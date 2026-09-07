import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/** Tutte le rotte di Better Auth: sign-in, sign-up, callback OAuth, verifica email. */
export const GET: RequestHandler = ({ request }) => auth.handler(request);
export const POST: RequestHandler = ({ request }) => auth.handler(request);
