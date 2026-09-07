<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from './Icon.svelte';

	type Tab = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

	const TABS: Tab[] = [
		{ href: '/', label: 'Feed', icon: 'feed', match: (p) => p === '/' },
		{
			href: '/libreria',
			label: 'Libreria',
			icon: 'library',
			match: (p) => p.startsWith('/libreria')
		},
		{ href: '/nuova', label: 'Nuova', icon: 'plus', match: (p) => p.startsWith('/nuova') },
		{ href: '/cerca', label: 'Cerca', icon: 'search', match: (p) => p.startsWith('/cerca') },
		{ href: '/profilo', label: 'Profilo', icon: 'user', match: (p) => p.startsWith('/profilo') }
	];
</script>

<!--
  Bottom nav: 5 voci esatte, il massimo prima che i bersagli diventino
  troppo stretti sui telefoni piccoli. Ogni voce ha icona + testo, mai
  la sola icona, perche' il target d'eta' arriva a 99 anni.
-->
<nav
	class="fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-lg sm:hidden"
	style="background:color-mix(in srgb, var(--c-bg) 88%, transparent);border-color:var(--c-border)"
	aria-label="Navigazione principale"
>
	<ul class="safe-bottom mx-auto flex max-w-lg items-stretch justify-around pt-1">
		{#each TABS as tab (tab.href)}
			{@const active = tab.match(page.url.pathname)}
			<li class="flex-1">
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class="flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors"
					class:is-active={active}
					style="color:{active ? 'var(--c-primary-text)' : 'var(--c-fg-muted)'}"
				>
					{#if tab.icon === 'plus'}
						<span
							class="flex h-7 w-7 items-center justify-center rounded-full"
							style="background:var(--c-primary);color:var(--c-on-primary)"
						>
							<Icon name="plus" size={18} strokeWidth={3} />
						</span>
					{:else}
						<Icon name={tab.icon} size={22} strokeWidth={active ? 2.6 : 2} />
					{/if}
					<span class="text-[11px] leading-none font-bold">{tab.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<!-- Desktop / tablet: la stessa navigazione diventa una barra laterale. -->
<nav
	class="hidden sm:sticky sm:top-0 sm:flex sm:h-dvh sm:w-56 sm:shrink-0 sm:flex-col sm:gap-1 sm:border-r sm:p-4 lg:w-64"
	style="border-color:var(--c-border)"
	aria-label="Navigazione principale"
>
	<a href="/" class="mb-4 flex items-center gap-2 rounded-lg px-2 py-2">
		<img src="/img/icon-192.png" alt="" width="36" height="36" class="h-9 w-9 rounded-xl" />
		<span class="text-xl font-extrabold" style="font-family:var(--font-display)">Pillole</span>
	</a>

	{#each TABS as tab (tab.href)}
		{@const active = tab.match(page.url.pathname)}
		{#if tab.icon === 'plus'}
			<a href={tab.href} class="btn btn-primary my-2 w-full">
				<Icon name="plus" size={20} strokeWidth={2.5} />
				Nuova pillola
			</a>
		{:else}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 font-bold transition-colors"
				style="color:{active ? 'var(--c-primary-text)' : 'var(--c-fg)'};background:{active
					? 'var(--c-primary-soft)'
					: 'transparent'}"
			>
				<Icon name={tab.icon} size={21} strokeWidth={active ? 2.6 : 2} />
				{tab.label}
			</a>
		{/if}
	{/each}
</nav>

<style>
	a:hover {
		background: var(--c-surface-2);
	}
	.is-active {
		background: transparent;
	}
</style>
