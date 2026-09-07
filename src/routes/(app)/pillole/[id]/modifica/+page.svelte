<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PillEditor from '$lib/components/PillEditor.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Modifica: {data.pill.title} — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/pillole/{data.pill.id}" class="btn btn-ghost mb-4 text-sm">
	<Icon name="chevron-left" size={18} />
	Torna alla pillola
</a>

<h1 class="mb-6 text-2xl sm:text-3xl">Modifica pillola</h1>

<PillEditor
	pillId={data.pill.id}
	canPublish={data.canPublish}
	initial={{
		title: data.pill.title,
		body: data.pill.body,
		format: data.pill.format as 'text' | 'latex',
		categoryId: data.pill.categoryId,
		isPublic: data.pill.isPublic,
		sources: data.pill.sources
	}}
/>
