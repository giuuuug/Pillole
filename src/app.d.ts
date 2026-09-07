import type { Session, User } from '$lib/server/auth';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
			/** Errori per campo di un fallimento di validazione (vedi guards.ts::readJson). */
			fields?: Record<string, string>;
		}
		interface Locals {
			user: User | null;
			session: Session | null;
		}
		interface PageData {
			user?: {
				id: string;
				name: string;
				username: string | null;
				email: string;
				image: string | null;
				emailVerified: boolean;
			} | null;
		}
	}
}

export {};
