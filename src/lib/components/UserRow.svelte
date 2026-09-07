<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/client/toast.svelte';
	import type { UserCard } from '$lib/server/services/social-service';
	import Avatar from './Avatar.svelte';
	import Badge from './Badge.svelte';
	import Icon from './Icon.svelte';

	type Props = { user: UserCard; canInteract?: boolean };
	let { user = $bindable(), canInteract = true }: Props = $props();

	let busy = $state(false);

	async function toggleFollow(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!canInteract) {
			toast.info('Accedi per seguire altre persone.');
			return;
		}

		const was = user.isFollowedByViewer;
		user.isFollowedByViewer = !was;
		busy = true;

		try {
			const res = await fetch(`/api/utenti/${user.username}/follow`, {
				method: was ? 'DELETE' : 'POST'
			});
			if (!res.ok) throw new Error();
			// Marca stale i `load` già eseguiti in questa sessione: senza
			// questo, navigare sul profilo di `user` può ancora mostrare lo
			// stato di segui precedente (vedi CLAUDE.md, gruppo reattività).
			await invalidateAll();
		} catch {
			user.isFollowedByViewer = was;
			toast.error('Operazione non riuscita. Riprova.');
		} finally {
			busy = false;
		}
	}
</script>

<div class="card relative flex items-center gap-3 p-3">
	<Avatar name={user.name} username={user.username} image={user.image} size={44} />

	<div class="min-w-0 flex-1">
		<a
			href="/u/{user.username}"
			class="flex items-center gap-1 after:absolute after:inset-0 after:content-['']"
		>
			<span class="block truncate font-extrabold">@{user.username}</span>
			<Badge id={user.badge} size={14} />
		</a>
		<span class="block truncate text-sm" style="color:var(--c-fg-muted)">
			{user.name} · {user.pillCount}
			{user.pillCount === 1 ? 'pillola' : 'pillole'}
		</span>
	</div>

	<button
		type="button"
		onclick={toggleFollow}
		disabled={busy}
		aria-pressed={user.isFollowedByViewer}
		class="btn relative z-10 shrink-0 text-sm"
		class:btn-ghost={user.isFollowedByViewer}
		class:btn-primary={!user.isFollowedByViewer}
	>
		<Icon name={user.isFollowedByViewer ? 'check' : 'plus'} size={17} strokeWidth={2.6} />
		{user.isFollowedByViewer ? 'Seguito' : 'Segui'}
	</button>
</div>
