/**
 * Badge assegnabili accanto al nome di un utente. Non sono scelti
 * dall'utente: si assegnano scrivendo direttamente `user.badge` nel
 * database (vedi CLAUDE.md). Aggiungere un nuovo badge = aggiungere una
 * voce qui + il relativo asset in `static/img/`.
 */
export const BADGES = {
	gold: { label: 'Superuser', image: '/img/verify-gold.png' }
} as const;

export type BadgeId = keyof typeof BADGES;

export function isBadgeId(value: string | null | undefined): value is BadgeId {
	return Boolean(value) && value! in BADGES;
}
