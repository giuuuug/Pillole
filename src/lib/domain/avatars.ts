/**
 * Galleria di avatar preimpostati (`static/img/avatar/`). Non c'e' un
 * legame 1:1 con le categorie (12 avatar, 15 categorie in categories.ts):
 * e' una scelta libera, non tematica.
 */
export const AVATAR_IDS = [
	'aristotele',
	'cesare',
	'darwin',
	'da_vinci',
	'feynman',
	'freud',
	'galilei',
	'gauss',
	'lavoisier',
	'newton',
	'pasteur',
	'turing'
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function avatarPath(id: AvatarId): string {
	return `/img/avatar/${id}.jpg`;
}

/** Tutti i path validi, per la validazione lato server (whitelist, mai un URL a piacere). */
export const AVATAR_PATHS = AVATAR_IDS.map(avatarPath);
