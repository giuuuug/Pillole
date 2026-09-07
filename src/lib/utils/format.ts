const rtf = new Intl.RelativeTimeFormat('it', { numeric: 'auto' });
const dateFmt = new Intl.DateTimeFormat('it-IT', {
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});
const monthYearFmt = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 31_536_000],
	['month', 2_592_000],
	['week', 604_800],
	['day', 86_400],
	['hour', 3600],
	['minute', 60]
];

/** "3 giorni fa". Oltre i 30 giorni passa alla data piena: piu' chiara. */
export function relativeTime(iso: string | Date): string {
	const date = typeof iso === 'string' ? new Date(iso) : iso;
	const seconds = (date.getTime() - Date.now()) / 1000;
	const abs = Math.abs(seconds);

	if (abs < 45) return 'adesso';
	if (abs > 2_592_000) return dateFmt.format(date);

	for (const [unit, secondsInUnit] of UNITS) {
		if (abs >= secondsInUnit) {
			return rtf.format(Math.round(seconds / secondsInUnit), unit);
		}
	}
	return 'adesso';
}

export function fullDate(iso: string | Date): string {
	return dateFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function monthYear(iso: string | Date): string {
	return monthYearFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** "1", "12", "1,2 mila" — evita numeri lunghi nei contatori del profilo. */
export function compactNumber(n: number): string {
	return new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 }).format(
		n
	);
}

/** Plurale italiano semplice per le etichette dei contatori. */
export function plural(n: number, one: string, many: string): string {
	return n === 1 ? one : many;
}
