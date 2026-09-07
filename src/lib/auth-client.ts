import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '$lib/server/auth';

export const authClient = createAuthClient({
	plugins: [usernameClient(), inferAdditionalFields<typeof auth>()]
});

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	changePassword,
	resetPassword,
	sendVerificationEmail
} = authClient;

/** Better Auth espone la richiesta di reset come `requestPasswordReset`. */
export const requestPasswordReset = authClient.requestPasswordReset;
