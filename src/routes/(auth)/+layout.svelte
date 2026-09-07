<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col" style="background:var(--c-surface)">
	<header class="safe-top flex items-center justify-between px-4 py-3">
		<a href="/" class="flex items-center gap-2">
			<img src="/img/icon-192.png" alt="" width="36" height="36" class="h-9 w-9 rounded-xl" />
			<span class="text-xl font-extrabold" style="font-family:var(--font-display)">Pillole</span>
		</a>
		<ThemeToggle />
	</header>

	<main
		id="contenuto"
		class="safe-bottom mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8"
	>
		{@render children()}
	</main>
</div>
