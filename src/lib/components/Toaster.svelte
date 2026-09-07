<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toast } from '$lib/client/toast.svelte';
	import Icon from './Icon.svelte';

	const ICON = { success: 'check', error: 'alert', info: 'info' } as const;
</script>

<!--
  `aria-live="polite"` + `role="status"`: gli screen reader leggono il
  messaggio senza interrompere quello che l'utente sta facendo.
-->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-6"
	role="status"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toast.items as t (t.id)}
		<div
			transition:fly={{ y: 16, duration: 220 }}
			class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg"
			style="background:var(--c-card);border-color:{t.kind === 'error'
				? 'var(--c-danger)'
				: t.kind === 'success'
					? 'var(--c-success)'
					: 'var(--c-border-strong)'}"
		>
			<span
				class="mt-0.5 shrink-0"
				style="color:{t.kind === 'error'
					? 'var(--c-danger)'
					: t.kind === 'success'
						? 'var(--c-success)'
						: 'var(--c-accent)'}"
			>
				<Icon name={ICON[t.kind]} size={20} />
			</span>
			<p class="min-w-0 flex-1 text-sm">{t.message}</p>
			<button
				type="button"
				class="-m-2 shrink-0 cursor-pointer p-2 opacity-60 hover:opacity-100"
				onclick={() => toast.dismiss(t.id)}
				aria-label="Chiudi notifica"
			>
				<Icon name="x" size={16} />
			</button>
		</div>
	{/each}
</div>
