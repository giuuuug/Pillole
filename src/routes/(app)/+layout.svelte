<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import TabBar from '$lib/components/TabBar.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let { children, data } = $props();

	// Su un dispositivo condiviso, "indietro" dopo un logout puo' ripristinare
	// questa pagina dalla bfcache del browser senza rieseguire alcun `load` —
	// mostrerebbe ancora l'header dell'account precedente. Un ricontrollo
	// forzato della sessione al ripristino chiude la finestra.
	onMount(() => {
		function onPageShow(e: PageTransitionEvent) {
			if (e.persisted) invalidateAll();
		}
		window.addEventListener('pageshow', onPageShow);
		return () => window.removeEventListener('pageshow', onPageShow);
	});
</script>

<div class="flex min-h-dvh">
	<TabBar />

	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="safe-top sticky top-0 z-40 border-b backdrop-blur-lg"
			style="background:color-mix(in srgb, var(--c-bg) 88%, transparent);border-color:var(--c-border)"
		>
			<div class="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
				<a href="/" class="flex items-center gap-2 sm:hidden">
					<img src="/img/icon-192.png" alt="" width="32" height="32" class="h-8 w-8 rounded-lg" />
					<span class="text-lg font-extrabold" style="font-family:var(--font-display)">Pillole</span
					>
				</a>

				<div class="flex-1"></div>

				{#if data.user}
					<a
						href="/profilo"
						class="flex min-h-11 min-w-11 items-center justify-center rounded-full"
						aria-label="Il tuo profilo"
					>
						<Avatar
							name={data.user.name}
							username={data.user.username}
							image={data.user.image}
							size={34}
						/>
					</a>
				{:else}
					<a
						href="/accedi?next={encodeURIComponent(page.url.pathname)}"
						class="btn btn-primary text-sm"
					>
						Accedi
					</a>
				{/if}
			</div>
		</header>

		<main
			id="contenuto"
			class="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-10"
		>
			{@render children()}
		</main>
	</div>
</div>
