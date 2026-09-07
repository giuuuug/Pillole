<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { infiniteScroll, Paginator } from '$lib/client/paginator.svelte';
	import { CATEGORIES } from '$lib/domain/categories';
	import type { PillCard as PillCardData } from '$lib/server/services/pill-service';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PillCard from '$lib/components/PillCard.svelte';
	import PillCardSkeleton from '$lib/components/PillCardSkeleton.svelte';
	import UserRow from '$lib/components/UserRow.svelte';

	let { data } = $props();

	// Chi ha scelto "riduci le animazioni" nel sistema operativo non deve
	// vedere le card volare dentro: la sostanza (il contenuto) e' la stessa.
	const reduceMotion = browser && matchMedia('(prefers-reduced-motion: reduce)').matches;

	// svelte-ignore state_referenced_locally
	const feed = new Paginator<PillCardData>(
		'/api/feed',
		() => ({ scope: data.scope, categoria: data.categoria ?? undefined }),
		data.feed
	);

	// Quando il server rimanda una prima pagina diversa (cambio tab o
	// categoria) il paginatore riparte da quella, senza rifetchare nulla.
	$effect(() => {
		feed.reset(data.feed);
	});

	function tabHref(scope: 'all' | 'following') {
		const params = new URLSearchParams();
		if (scope !== 'all') params.set('scope', scope);
		if (data.categoria) params.set('categoria', data.categoria);
		const qs = params.toString();
		return qs ? `/?${qs}` : '/';
	}

	function categoryHref(id: string | null) {
		const params = new URLSearchParams();
		if (data.scope !== 'all') params.set('scope', data.scope);
		if (id) params.set('categoria', id);
		const qs = params.toString();
		return qs ? `/?${qs}` : '/';
	}
</script>

<svelte:head>
	<title>Feed — Pillole</title>
	<meta
		name="description"
		content="Le pillole di conoscenza condivise dalla community: matematica, fisica, tech, curiosità e molto altro."
	/>
</svelte:head>

<h1 class="sr-only">Feed delle pillole pubbliche</h1>

{#if !data.user}
	<!-- Chi non ha ancora un account vede subito di cosa si tratta,
	     ma il feed resta leggibile: prima il valore, poi la registrazione. -->
	<section class="card mb-5 overflow-hidden">
		<div class="p-5 sm:p-7">
			<p class="text-sm font-bold" style="color:var(--c-primary-text)">Benvenuto su Pillole</p>
			<h2 class="mt-1.5 text-2xl sm:text-3xl">Una cosa che sai, spiegata in due minuti.</h2>
			<p class="mt-2.5 text-sm sm:text-base" style="color:var(--c-fg-muted)">
				Scrivi le tue pillole di conoscenza, tienile private nella tua libreria o condividile con
				gli altri. Gratis, per sempre.
			</p>
			<div class="mt-5 flex flex-wrap gap-3">
				<a href="/registrati" class="btn btn-primary">
					Crea il tuo account
					<Icon name="arrow-right" size={19} />
				</a>
				<a href="/accedi" class="btn btn-ghost">Ho già un account</a>
			</div>
		</div>
	</section>
{/if}

<!-- Tab: due sole voci, con `aria-current` per chi usa uno screen reader. -->
<div class="mb-4 flex gap-1 border-b" style="border-color:var(--c-border)" role="tablist">
	{#each [{ id: 'all', label: 'Per te' }, { id: 'following', label: 'Seguiti' }] as const as tab (tab.id)}
		{@const active = data.scope === tab.id}
		<a
			href={tabHref(tab.id)}
			role="tab"
			aria-selected={active}
			aria-current={active ? 'page' : undefined}
			data-sveltekit-noscroll
			class="relative -mb-px flex min-h-11 items-center px-4 font-bold transition-colors"
			style="color:{active ? 'var(--c-primary-text)' : 'var(--c-fg-muted)'}"
		>
			{tab.label}
			{#if active}
				<span
					class="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full"
					style="background:var(--c-primary)"
				></span>
			{/if}
		</a>
	{/each}
</div>

<!-- Filtro categorie: scorre in orizzontale nel suo contenitore, la pagina no. -->
<div class="-mx-4 mb-5 overflow-x-auto px-4 pb-1">
	<div class="flex w-max gap-2" role="group" aria-label="Filtra per categoria">
		<a
			href={categoryHref(null)}
			data-sveltekit-noscroll
			class="chip min-h-9"
			aria-current={!data.categoria ? 'true' : undefined}
			style={!data.categoria
				? 'background:var(--c-fg);color:var(--c-bg);border-color:transparent'
				: ''}
		>
			Tutte
		</a>
		{#each CATEGORIES as cat (cat.id)}
			{@const active = data.categoria === cat.id}
			<a
				href={categoryHref(active ? null : cat.id)}
				data-sveltekit-noscroll
				class="chip min-h-9"
				aria-current={active ? 'true' : undefined}
				style={active
					? `background:${cat.color};color:${cat.onColor};border-color:transparent`
					: ''}
			>
				<Icon name={cat.icon as never} size={14} strokeWidth={2.5} />
				{cat.label}
			</a>
		{/each}
	</div>
</div>

{#if feed.items.length === 0}
	{#if data.scope === 'following'}
		<EmptyState
			icon="users"
			title="Il tuo feed è ancora vuoto"
			description="Segui qualcuno per vedere qui le sue pillole pubbliche."
		>
			<a href="/cerca?tipo=persone" class="btn btn-primary">
				<Icon name="search" size={19} />
				Trova persone
			</a>
		</EmptyState>

		{#if data.suggested.length > 0}
			<section class="mt-2" aria-labelledby="suggeriti">
				<h2 id="suggeriti" class="mb-3 text-lg">Chi pubblica di più</h2>
				<div class="space-y-2">
					{#each data.suggested as u (u.id)}
						<UserRow user={u} canInteract={Boolean(data.user)} />
					{/each}
				</div>
			</section>
		{/if}
	{:else}
		<EmptyState
			title="Ancora nessuna pillola pubblica"
			description="Sii il primo: scrivi una pillola e rendila pubblica per condividerla."
		>
			<a href="/nuova" class="btn btn-primary">
				<Icon name="plus" size={19} />
				Scrivi la prima
			</a>
		</EmptyState>
	{/if}
{:else}
	<div class="space-y-3">
		{#each feed.items as item, i (item.id)}
			{@const isNew = i >= feed.lastBatchStart}
			<div
				in:fly={{
					y: 16,
					duration: reduceMotion || !isNew ? 0 : 260,
					delay: reduceMotion || !isNew ? 0 : (i - feed.lastBatchStart) * 60
				}}
			>
				<PillCard bind:pill={feed.items[i]} canInteract={Boolean(data.user)} />
			</div>
		{/each}
	</div>

	{#if !feed.exhausted}
		<div use:infiniteScroll={() => feed.loadMore()} class="mt-3">
			{#if feed.loading}
				<div in:fade={{ duration: reduceMotion ? 0 : 150 }}>
					<PillCardSkeleton count={2} />
				</div>
			{/if}
			<p class="sr-only" role="status" aria-live="polite">
				{feed.loading ? 'Carico altre pillole' : ''}
			</p>
		</div>
		<!-- Fallback esplicito: senza JS, o se l'observer non scatta,
		     resta comunque un modo per andare avanti. -->
		<noscript>
			<p class="mt-4 text-center text-sm" style="color:var(--c-fg-muted)">
				Attiva JavaScript per caricare altre pillole.
			</p>
		</noscript>
	{:else if feed.items.length > 6}
		<p class="mt-8 text-center text-sm" style="color:var(--c-fg-muted)">
			Hai visto tutto. Torna più tardi.
		</p>
	{/if}
{/if}
