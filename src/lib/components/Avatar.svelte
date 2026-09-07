<script lang="ts">
	type Props = {
		name: string;
		username?: string | null;
		image?: string | null;
		size?: number;
	};
	let { name, username = null, image = null, size = 40 }: Props = $props();

	const initials = $derived(
		(name || username || '?')
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	// Tinta derivata dal nome: stabile, e sempre con testo bianco sopra.
	// L=29%: a parita' di lightness HSL il contrasto reale (luminanza
	// percepita, non lineare) varia con la tinta — il giallo-verde (hue~60)
	// e' il caso peggiore. Trovato con un audit automatico su axe-core
	// (2026-09-07): a L=32% quella fascia di tinte scendeva a 4.26:1,
	// sotto la soglia 4.5:1 WCAG AA. Verificato su tutte le 360 tinte:
	// a L=29% il contrasto minimo e' 5.02:1.
	const hue = $derived(
		[...(username ?? name ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
	);
</script>

{#if image}
	<img
		src={image}
		alt=""
		width={size}
		height={size}
		loading="lazy"
		decoding="async"
		class="shrink-0 rounded-full object-cover"
		style="width:{size}px;height:{size}px;background:var(--c-surface-2)"
	/>
{:else}
	<span
		aria-hidden="true"
		class="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none"
		style="width:{size}px;height:{size}px;font-size:{Math.round(
			size * 0.38
		)}px;background:hsl({hue} 55% 29%);font-family:var(--font-display)"
	>
		{initials}
	</span>
{/if}
