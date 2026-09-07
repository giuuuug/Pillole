<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/client/toast.svelte';
	import { compactNumber, monthYear } from '$lib/utils/format';
	import type { PillCard as PillCardData } from '$lib/server/services/pill-service';
	import Avatar from '$lib/components/Avatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PillCard from '$lib/components/PillCard.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let profile = $state(data.profile);
	// svelte-ignore state_referenced_locally
	let pills = $state<PillCardData[]>(data.pills.items);

	$effect(() => {
		profile = data.profile;
		pills = data.pills.items;
	});

	let busy = $state(false);

	async function toggleFollow() {
		if (!data.user) {
			toast.info('Accedi per seguire questa persona.');
			return;
		}

		const was = profile.isFollowedByViewer;
		profile.isFollowedByViewer = !was;
		profile.followerCount += was ? -1 : 1;
		busy = true;

		try {
			const res = await fetch(`/api/utenti/${profile.username}/follow`, {
				method: was ? 'DELETE' : 'POST'
			});
			if (!res.ok) throw new Error();
			toast.success(was ? `Non segui più @${profile.username}` : `Ora segui @${profile.username}`);
			await invalidateAll();
		} catch {
			profile.isFollowedByViewer = was;
			profile.followerCount += was ? 1 : -1;
			toast.error('Operazione non riuscita. Riprova.');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>@{profile.username} — Pillole</title>
	<meta
		name="description"
		content="Le pillole di conoscenza pubblicate da @{profile.username} su Pillole."
	/>
</svelte:head>

<section class="card p-5">
	<div class="flex items-start gap-4">
		<Avatar name={profile.name} username={profile.username} image={profile.image} size={72} />

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-xl" style="font-family:var(--font-display)">@{profile.username}</h1>
			<p class="truncate text-sm" style="color:var(--c-fg-muted)">{profile.name}</p>
			<p class="mt-0.5 text-xs" style="color:var(--c-fg-muted)">
				Su Pillole da {monthYear(profile.memberSince)}
			</p>
		</div>
	</div>

	{#if profile.bio}
		<p class="mt-4">{profile.bio}</p>
	{/if}

	<!-- Contatori: sono link, perche' un numero che non porta da nessuna parte
	     e' solo decorazione. -->
	<div class="mt-4 flex flex-wrap gap-4 text-sm">
		<span><strong class="font-extrabold">{compactNumber(profile.pillCount)}</strong> pillole</span>
		<a href="/u/{profile.username}/follower" class="hover:underline">
			<strong class="font-extrabold">{compactNumber(profile.followerCount)}</strong> follower
		</a>
		<a href="/u/{profile.username}/seguiti" class="hover:underline">
			<strong class="font-extrabold">{compactNumber(profile.followingCount)}</strong> seguiti
		</a>
	</div>

	<div class="mt-5">
		{#if profile.isSelf}
			<a href="/profilo/modifica" class="btn btn-ghost w-full">
				<Icon name="settings" size={19} />
				Modifica il tuo profilo
			</a>
		{:else}
			<button
				type="button"
				class="btn w-full"
				class:btn-primary={!profile.isFollowedByViewer}
				class:btn-ghost={profile.isFollowedByViewer}
				onclick={toggleFollow}
				disabled={busy}
				aria-pressed={profile.isFollowedByViewer}
			>
				<Icon name={profile.isFollowedByViewer ? 'check' : 'plus'} size={19} strokeWidth={2.6} />
				{profile.isFollowedByViewer ? 'Segui già' : `Segui @${profile.username}`}
			</button>
		{/if}
	</div>
</section>

<h2 class="mt-6 mb-3 text-lg">Pillole pubbliche</h2>

{#if pills.length === 0}
	<EmptyState
		title="Ancora niente di pubblico"
		description={profile.isSelf
			? 'Le tue pillole pubbliche compariranno qui.'
			: `@${profile.username} non ha ancora pubblicato nulla.`}
	/>
{:else}
	<div class="space-y-3">
		{#each pills as p, i (p.id)}
			<PillCard bind:pill={pills[i]} showAuthor={false} canInteract={Boolean(data.user)} />
		{/each}
	</div>
{/if}
