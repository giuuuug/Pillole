<script lang="ts">
	import { goto } from '$app/navigation';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PillCard from '$lib/components/PillCard.svelte';
	import UserRow from '$lib/components/UserRow.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let query = $state(data.q);
	// svelte-ignore state_referenced_locally
	let tipo = $state<'pillole' | 'persone'>(data.tipo);
	let debounce: ReturnType<typeof setTimeout>;

	// Il server rimanda i risultati; qui teniamo copie locali solo perche'
	// le card aggiornano `isSaved` / `isFollowedByViewer` in modo ottimistico.
	// svelte-ignore state_referenced_locally
	let pills = $state(data.pills);
	// svelte-ignore state_referenced_locally
	let users = $state(data.users);

	$effect(() => {
		query = data.q;
		tipo = data.tipo;
		pills = data.pills;
		users = data.users;
	});

	/**
	 * 300 ms di debounce: sotto questa soglia si manda una richiesta per
	 * ogni tasto premuto, e con un database a cold start si paga caro.
	 */
	function onInput() {
		clearTimeout(debounce);
		debounce = setTimeout(run, 300);
	}

	function run() {
		const params = new URLSearchParams();
		if (query.trim()) params.set('q', query.trim());
		if (tipo !== 'pillole') params.set('tipo', tipo);
		goto(`/cerca?${params}`, { keepFocus: true, replaceState: true, noScroll: true });
	}

	function switchType(next: 'pillole' | 'persone') {
		tipo = next;
		run();
	}
</script>

<svelte:head>
	<title>Cerca — Pillole</title>
	<meta name="description" content="Cerca pillole di conoscenza e persone su Pillole." />
	{#if data.q}
		<!-- Ogni ricerca è un URL diverso (?q=...): indicizzarle tutte inquinerebbe
		     i risultati con pagine quasi duplicate. Resta indicizzabile solo la
		     pagina di ricerca vuota, non i suoi risultati. -->
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<h1 class="mb-4 text-2xl sm:text-3xl">Cerca</h1>

<form
	role="search"
	onsubmit={(e) => {
		e.preventDefault();
		clearTimeout(debounce);
		run();
	}}
>
	<label class="sr-only" for="q">
		{tipo === 'persone' ? 'Cerca per username o nome' : 'Cerca tra le pillole'}
	</label>
	<div class="relative">
		<span
			class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
			style="color:var(--c-fg-muted)"
		>
			<Icon name="search" size={20} />
		</span>
		<input
			id="q"
			type="search"
			class="input !pl-11"
			bind:value={query}
			oninput={onInput}
			placeholder={tipo === 'persone' ? '@username o nome' : 'entropia, microonde, DNA…'}
			autocomplete="off"
			enterkeyhint="search"
		/>
	</div>
</form>

<div class="mt-4 mb-5 flex gap-2" role="group" aria-label="Cosa cercare">
	{#each [{ id: 'pillole', label: 'Pillole', icon: 'pill' }, { id: 'persone', label: 'Persone', icon: 'users' }] as const as t (t.id)}
		{@const active = tipo === t.id}
		<button
			type="button"
			onclick={() => switchType(t.id)}
			aria-pressed={active}
			class="chip min-h-11 cursor-pointer"
			style={active ? 'background:var(--c-fg);color:var(--c-bg);border-color:transparent' : ''}
		>
			<Icon name={t.icon} size={16} strokeWidth={2.5} />
			{t.label}
		</button>
	{/each}
</div>

<!-- Il conteggio dei risultati e' annunciato agli screen reader a ogni ricerca. -->
<p class="sr-only" role="status" aria-live="polite">
	{#if data.q}
		{tipo === 'persone' ? users.length : pills.length} risultati per {data.q}
	{/if}
</p>

{#if !data.q}
	<EmptyState
		icon="search"
		title="Cosa vuoi sapere oggi?"
		description={tipo === 'persone'
			? 'Cerca una persona per username o nome e inizia a seguirla.'
			: 'Cerca fra le pillole pubbliche e le tue. Funziona anche con più parole.'}
	/>
{:else if tipo === 'persone'}
	{#if users.length === 0}
		<EmptyState
			icon="users"
			title="Nessuna persona trovata"
			description="Controlla l’username: la ricerca parte dall’inizio del nome."
		/>
	{:else}
		<div class="space-y-2">
			{#each users as u, i (u.id)}
				<UserRow bind:user={users[i]} canInteract={Boolean(data.user)} />
			{/each}
		</div>
	{/if}
{:else if pills.length === 0}
	<EmptyState
		title="Nessuna pillola trovata"
		description="Prova con parole diverse, oppure scrivila tu: forse manca davvero."
	>
		<a href="/nuova" class="btn btn-primary"><Icon name="plus" size={19} />Scrivila tu</a>
	</EmptyState>
{:else}
	<div class="space-y-3">
		{#each pills as p, i (p.id)}
			<PillCard bind:pill={pills[i]} canInteract={Boolean(data.user)} />
		{/each}
	</div>
{/if}
