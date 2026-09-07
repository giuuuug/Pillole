<script lang="ts">
	import { renderPillBody } from '$lib/utils/render';

	type Props = { body: string; format?: string; class?: string };
	let { body, format = 'text', class: className = '' }: Props = $props();

	// Il risultato e' HTML generato da noi a partire da testo gia' escaped
	// (vedi $lib/utils/render): l'input dell'utente non arriva mai al DOM come markup.
	const html = $derived(renderPillBody(body, format));
</script>

<div class="pill-body {className}">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>

<style>
	.pill-body :global(p) {
		margin: 0 0 1rem;
		font-size: var(--text-base);
		line-height: 1.7;
	}
	.pill-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.pill-body :global(strong) {
		font-weight: 700;
	}
	.pill-body :global(code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--c-surface-2);
		border: 1px solid var(--c-border);
		border-radius: 6px;
		padding: 0.1em 0.35em;
		word-break: break-word;
	}
	.pill-body :global(a) {
		color: var(--c-accent);
		/* Il link non e' distinto solo dal colore: c'e' anche la sottolineatura. */
		text-decoration: underline;
		text-underline-offset: 3px;
		word-break: break-word;
	}
	.pill-body :global(a:hover) {
		color: var(--c-accent-hover);
	}
	.pill-body :global(.katex) {
		font-size: 1.05em;
	}
	.pill-body :global(.katex-error) {
		color: var(--c-danger);
		background: var(--c-danger-soft);
	}
</style>
