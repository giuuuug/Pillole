<script lang="ts">
	import ConnectionList from '$lib/components/ConnectionList.svelte';

	let { data } = $props();
</script>

<ConnectionList
	users={data.users}
	username={data.username}
	direction={data.direction}
	canInteract={Boolean(data.user)}
/>
