<script lang="ts">
	import PillEditor from '$lib/components/PillEditor.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Nuova pillola — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="mb-6">
	<h1 class="text-2xl sm:text-3xl">Nuova pillola</h1>
	<p class="mt-1 text-sm" style="color:var(--c-fg-muted)">
		Una cosa che sai, spiegata come la spiegheresti a un amico al bar.
	</p>
</header>

<PillEditor canPublish={data.canPublish} />
