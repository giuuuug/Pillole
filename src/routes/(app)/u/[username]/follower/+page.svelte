<script lang="ts">
	import ConnectionList from '$lib/components/ConnectionList.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Follower di @{data.username} — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<ConnectionList
	users={data.users}
	username={data.username}
	direction={data.direction}
	canInteract={Boolean(data.user)}
/>
