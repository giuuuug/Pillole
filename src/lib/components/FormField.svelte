<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Etichetta + campo + messaggio (errore, o un aiuto quando non c'è
	 * errore) — lo scheletro ripetuto in ogni form dell'app. Il campo vero
	 * (input/textarea/select) resta al chiamante: varia troppo da un form
	 * all'altro per generalizzarlo, ma `aria-invalid`/`aria-describedby`
	 * arrivano già pronti, così non si dimenticano su un campo nuovo.
	 */
	type Props = {
		id: string;
		label: string;
		error?: string;
		hint?: string;
		children: Snippet<
			[{ 'aria-invalid': 'true' | undefined; 'aria-describedby': string | undefined }]
		>;
	};

	let { id, label, error, hint, children }: Props = $props();

	const describedById = $derived(error ? `err-${id}` : hint ? `hint-${id}` : undefined);
</script>

<div>
	<label class="label" for={id}>{label}</label>
	{@render children({
		'aria-invalid': error ? 'true' : undefined,
		'aria-describedby': describedById
	})}
	{#if error}
		<p id={describedById} class="mt-1.5 text-sm font-bold" style="color:var(--c-danger)">
			{error}
		</p>
	{:else if hint}
		<p id={describedById} class="mt-1.5 text-sm" style="color:var(--c-fg-muted)">
			{hint}
		</p>
	{/if}
</div>
