<script lang="ts">
	import { infiniteScroll, Paginator } from '$lib/client/paginator.svelte';
	import { CATEGORIES } from '$lib/domain/categories';
	import type { PillCard as PillCardData } from '$lib/server/services/pill-service';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PillCard from '$lib/components/PillCard.svelte';
	import PillCardSkeleton from '$lib/components/PillCardSkeleton.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const library = new Paginator<PillCardData>(
		'/api/libreria',
		() => ({ filtro: data.filtro, categoria: data.categoria ?? undefined }),
		data.library
	);

	$effect(() => {
		library.reset(data.library);
	});

	const FILTERS = [
		{ id: 'all', label: 'Tutte' },
		{ id: 'mine', label: 'Scritte da me' },
		{ id: 'saved', label: 'Salvate' },
		{ id: 'favorites', label: 'Preferite' }
	] as const;

	function href(next: { filtro?: string; categoria?: string | null }) {
		const params = new URLSearchParams();
		const filtro = next.filtro ?? data.filtro;
		const categoria = next.categoria === undefined ? data.categoria : next.categoria;
		if (filtro !== 'all') params.set('filtro', filtro);
		if (categoria) params.set('categoria', categoria);
		const qs = params.toString();
		return qs ? `/libreria?${qs}` : '/libreria';
	}

	// Solo gli scaffali con almeno una pillola: una libreria non mostra
	// quindici ripiani vuoti.
	const shelves = $derived(CATEGORIES.filter((c) => (data.shelfCounts[c.id] ?? 0) > 0));
	const total = $derived(Object.values(data.shelfCounts).reduce((a, b) => a + b, 0));
</script>

<svelte:head>
	<title>La tua libreria — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mb-4 flex items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl sm:text-3xl">La tua libreria</h1>
		<p class="mt-1 text-sm" style="color:var(--c-fg-muted)">
			{total}
			{total === 1 ? 'pillola' : 'pillole'} sui tuoi scaffali
		</p>
	</div>
	<a href="/nuova" class="btn btn-primary shrink-0 text-sm" aria-label="Nuova pillola">
		<Icon name="plus" size={19} strokeWidth={2.5} />
		<span class="hidden sm:inline">Nuova</span>
	</a>
</div>

<!-- Gli scaffali: le categorie in cui l'utente ha davvero qualcosa. -->
{#if shelves.length > 0 && !data.categoria}
	<section class="mb-6" aria-labelledby="scaffali">
		<h2 id="scaffali" class="mb-2.5 text-sm font-bold" style="color:var(--c-fg-muted)">
			I tuoi scaffali
		</h2>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each shelves as cat (cat.id)}
				<a
					href={href({ categoria: cat.id })}
					class="card flex min-h-16 items-center gap-3 p-3 transition-transform hover:-translate-y-0.5"
				>
					<span
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
						style="background:{cat.color};color:{cat.onColor}"
					>
						<Icon name={cat.icon as never} size={20} strokeWidth={2.5} />
					</span>
					<span class="min-w-0">
						<span class="block truncate text-sm font-extrabold">{cat.label}</span>
						<span class="block text-xs" style="color:var(--c-fg-muted)">
							{data.shelfCounts[cat.id]}
						</span>
					</span>
				</a>
			{/each}
		</div>
	</section>
{/if}

{#if data.categoria}
	{@const cat = CATEGORIES.find((c) => c.id === data.categoria)}
	<a href={href({ categoria: null })} class="btn btn-ghost mb-4 text-sm">
		<Icon name="chevron-left" size={18} />
		Tutti gli scaffali
	</a>
	{#if cat}
		<h2 class="mb-3 text-xl">{cat.label}</h2>
	{/if}
{/if}

<div class="-mx-4 mb-4 overflow-x-auto px-4 pb-1">
	<div class="flex w-max gap-2" role="group" aria-label="Filtra la libreria">
		{#each FILTERS as f (f.id)}
			{@const active = data.filtro === f.id}
			<a
				href={href({ filtro: f.id })}
				data-sveltekit-noscroll
				class="chip min-h-9"
				aria-current={active ? 'true' : undefined}
				style={active ? 'background:var(--c-fg);color:var(--c-bg);border-color:transparent' : ''}
			>
				{f.label}
			</a>
		{/each}
	</div>
</div>

{#if library.items.length === 0}
	<EmptyState
		icon={data.filtro === 'saved' ? 'bookmark' : 'library'}
		title={data.filtro === 'saved' ? 'Nessuna pillola salvata' : 'La libreria è vuota'}
		description={data.filtro === 'saved'
			? 'Quando salvi la pillola di qualcun altro finisce qui, con il nome di chi l’ha scritta.'
			: 'Scrivi la tua prima pillola: bastano due righe su qualcosa che sai già.'}
	>
		{#if data.filtro === 'saved'}
			<a href="/" class="btn btn-primary"><Icon name="feed" size={19} />Esplora il feed</a>
		{:else}
			<a href="/nuova" class="btn btn-primary"><Icon name="plus" size={19} />Scrivi una pillola</a>
		{/if}
	</EmptyState>
{:else}
	<div class="space-y-3">
		{#each library.items as item, i (item.id)}
			<PillCard bind:pill={library.items[i]} showAuthor={!item.isMine} />
		{/each}
	</div>

	{#if !library.exhausted}
		<div use:infiniteScroll={() => library.loadMore()} class="mt-3">
			<PillCardSkeleton count={2} />
		</div>
	{/if}
{/if}
