<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
</script>

<div class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
	<span
		class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
		style="background:var(--c-primary-soft);color:var(--c-primary-text)"
	>
		<Icon name={page.status === 404 ? 'search' : 'alert'} size={30} />
	</span>

	<h1 class="text-3xl font-extrabold">
		{page.status === 404 ? 'Pillola non trovata' : 'Qualcosa non ha funzionato'}
	</h1>

	<p class="mt-3" style="color:var(--c-fg-muted)">{page.error?.message}</p>

	{#if page.error?.code}
		<p class="mt-2 text-xs" style="color:var(--c-fg-muted)">
			Codice errore: <code>{page.error.code}</code>
		</p>
	{/if}

	<a href="/" class="btn btn-primary mt-8">
		<Icon name="feed" size={19} />
		Torna al feed
	</a>
</div>
