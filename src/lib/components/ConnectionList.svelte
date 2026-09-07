<script lang="ts">
	import type { UserCard } from '$lib/server/services/social-service';
	import EmptyState from './EmptyState.svelte';
	import Icon from './Icon.svelte';
	import UserRow from './UserRow.svelte';

	type Props = {
		users: UserCard[];
		username: string;
		direction: 'followers' | 'following';
		canInteract: boolean;
	};

	let { users, username, direction, canInteract }: Props = $props();

	// $derived scrivibile: parte da `users` e si riallinea da solo quando la
	// prop cambia, ma resta modificabile in locale (es. dopo un unfollow).
	let list = $derived(users);

	const title = $derived(direction === 'followers' ? 'Follower' : 'Seguiti');
</script>

<svelte:head>
	<title>{title} di @{username} — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/u/{username}" class="btn btn-ghost mb-4 text-sm">
	<Icon name="chevron-left" size={18} />
	@{username}
</a>

<h1 class="mb-4 text-2xl">{title}</h1>

{#if list.length === 0}
	<EmptyState
		icon="users"
		title={direction === 'followers' ? 'Ancora nessun follower' : 'Non segue ancora nessuno'}
		description={direction === 'followers'
			? 'Pubblicare qualche pillola è il modo più veloce per farsi trovare.'
			: 'Le persone seguite compariranno qui.'}
	/>
{:else}
	<div class="space-y-2">
		{#each list as u, i (u.id)}
			<UserRow bind:user={list[i]} {canInteract} />
		{/each}
	</div>
{/if}
