<script lang="ts" module>
	/**
	 * Set di icone inline (tracciati stile Lucide, licenza ISC).
	 *
	 * Inline e non da CDN: nessuna richiesta di rete, nessun font di icone
	 * che sfarfalla, e la CSP puo' restare `default-src 'self'`.
	 * Regola dell'app: MAI emoji al posto di un'icona.
	 */
	export const ICONS = {
		feed: 'M4 6h16M4 12h16M4 18h10',
		library:
			'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
		search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35',
		plus: 'M12 5v14M5 12h14',
		user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
		users:
			'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		heart:
			'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.7 1.1-1a5.5 5.5 0 0 0 0-7.8z',
		bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
		check: 'M20 6L9 17l-5-5',
		x: 'M18 6L6 18M6 6l12 12',
		'chevron-left': 'M15 18l-6-6 6-6',
		'chevron-right': 'M9 18l6-6-6-6',
		'chevron-down': 'M6 9l6 6 6-6',
		'arrow-right': 'M5 12h14M12 5l7 7-7 7',
		'arrow-up': 'M12 19V5M5 12l7-7 7 7',
		eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
		'eye-off':
			'M9.9 4.2A9.1 9.1 0 0 1 12 4c6.4 0 10 7 10 7a17 17 0 0 1-2.7 3.7 M6.6 6.6A17 17 0 0 0 2 11s3.6 7 10 7a9 9 0 0 0 4.4-1.1 M2 2l20 20 M10 10a3 3 0 0 0 4 4',
		globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z',
		lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
		sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
		moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
		'external-link':
			'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3',
		trash:
			'M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
		edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
		logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
		settings:
			'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915',
		alert:
			'M12 9v4M12 17h.01 M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
		info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 16v-4 M12 8h.01',
		mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 7l-10 6L2 7',
		link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
		loader:
			'M12 2v4 M12 18v4 M4.9 4.9l2.9 2.9 M16.2 16.2l2.9 2.9 M2 12h4 M18 12h4 M4.9 19.1l2.9-2.9 M16.2 7.8l2.9-2.9',
		filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
		clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
		pill: 'M10.5 20.5a6.4 6.4 0 0 1-9-9l6-6a6.4 6.4 0 0 1 9 9z M8.5 8.5l7 7',
		key: 'M2 21l9.6-9.6 M7.5 15.5l2.3 2.3a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0L4 19 M15.5 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
		function: 'M9 20c1.5 0 2-1 2.5-3.5L14 5c.5-2.5 1-3.5 2.5-3.5 M6 9h9',
		/* --- categorie --- */
		sigma: 'M18 4H7l6 8-6 8h11',
		atom: 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M20.2 20.2c2-2 .5-7.4-3.4-11.3S7.8 2.3 5.8 4.3s-.5 7.4 3.4 11.3 9 5.6 11 3.6z M20.2 4.3c-2-2-7.4-.5-11.3 3.4S2.3 16.2 4.3 18.2s7.4.5 11.3-3.4 5.6-9 3.6-11z',
		flask: 'M9 3h6 M10 3v6.5L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9.5V3 M7 15h10',
		leaf: 'M11 20A7 7 0 0 1 4 13c0-6 5-9 16-10 0 9-4 16-11 17z M4 21c2-6 6-9 11-10',
		'heart-pulse':
			'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.7 1.1-1a5.5 5.5 0 0 0 0-7.8z M2.5 12H7l2-3 3 6 2-3h4.5',
		cpu: 'M6 6h12v12H6z M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
		rocket:
			'M5 13c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.9.8-2.2 0-3s-2.1-.8-3 0z M12.5 15.5L8.5 11.5a14 14 0 0 1 9-9.4 1 1 0 0 1 1.3 1.3 14 14 0 0 1-6.3 12.1z M15 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
		scroll:
			'M8 21h11a3 3 0 0 0 3-3v-1h-6 M19 17V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v1h6 M8 7v11a3 3 0 0 1-3 3',
		palette:
			'M12 21a9 9 0 1 1 0-18c5 0 9 3.6 9 8 0 2.2-1.8 4-4 4h-2a2 2 0 0 0-1.4 3.4A1.9 1.9 0 0 1 12 21z M7.5 10.5h.01M10.5 7h.01M14.5 7.5h.01M17 10.5h.01',
		languages: 'M2 5h10 M7 3v2c0 4-2.5 7-5 8 M5 10c0 2.5 2.5 5 6 6 M15 21l4.5-11 4.5 11 M16.5 17h6',
		'trending-up': 'M22 7l-8.5 8.5-4-4L2 19 M16 7h6v6',
		brain:
			'M9.5 2A2.5 2.5 0 0 0 7 4.5v.6A3 3 0 0 0 5 8a3 3 0 0 0 .5 1.7A3 3 0 0 0 5 15a3 3 0 0 0 2 2.8V19a2.5 2.5 0 0 0 5 0V4.5A2.5 2.5 0 0 0 9.5 2z M14.5 2A2.5 2.5 0 0 1 17 4.5v.6A3 3 0 0 1 19 8a3 3 0 0 1-.5 1.7A3 3 0 0 1 19 15a3 3 0 0 1-2 2.8V19a2.5 2.5 0 0 1-5 0',
		lightbulb:
			'M9 21h6 M10 18h4 M12 2a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2h5c0-.8.4-1.5 1-2A6 6 0 0 0 12 2z',
		sparkles:
			'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
		'book-open':
			'M12 7c0-1.7-2.2-3-5-3H2v14h5c2.8 0 5 1.3 5 3 0-1.7 2.2-3 5-3h5V4h-5c-2.8 0-5 1.3-5 3z M12 7v14'
	} as const;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	type Props = {
		name: IconName;
		size?: number;
		/** Etichetta accessibile. Se assente l'icona e' decorativa e viene nascosta agli screen reader. */
		label?: string;
		class?: string;
		strokeWidth?: number;
		/**
		 * Riempita invece che solo a contorno. Usata per stati binari (salvata,
		 * preferita, ...): il colore da solo non e' un veicolo di significato
		 * accettabile (persone daltoniche, poca luce) — qui la FORMA cambia,
		 * il colore e' solo un rinforzo.
		 */
		filled?: boolean;
	};

	let {
		name,
		size = 22,
		label,
		class: className = '',
		strokeWidth = 2,
		filled = false
	}: Props = $props();

	const paths = $derived(ICONS[name]?.split(' M').map((p, i) => (i === 0 ? p : `M${p}`)) ?? []);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	role={label ? 'img' : 'presentation'}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>
