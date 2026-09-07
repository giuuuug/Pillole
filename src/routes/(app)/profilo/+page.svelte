<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { toast } from '$lib/client/toast.svelte';
	import { computeAge } from '$lib/domain/validation';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		await authClient.signOut();
		await invalidateAll();
		await goto('/');
		toast.success('A presto!');
	}

	const age = $derived(data.profile.birthDate ? computeAge(data.profile.birthDate) : null);
</script>

<svelte:head>
	<title>Il tuo profilo — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<h1 class="sr-only">Il tuo profilo</h1>

<section class="card p-5">
	<div class="flex items-center gap-4">
		<Avatar
			name={data.user?.name ?? ''}
			username={data.profile.username}
			image={data.user?.image}
			size={64}
		/>
		<div class="min-w-0">
			<p class="truncate text-xl font-extrabold" style="font-family:var(--font-display)">
				{data.user?.name}
			</p>
			{#if data.profile.username}
				<p class="truncate text-sm" style="color:var(--c-fg-muted)">@{data.profile.username}</p>
			{:else}
				<a href="/profilo/modifica" class="text-sm font-bold" style="color:var(--c-primary-text)">
					Scegli un username →
				</a>
			{/if}
			{#if age !== null}
				<p class="text-sm" style="color:var(--c-fg-muted)">{age} anni</p>
			{/if}
		</div>
	</div>

	{#if data.profile.bio}
		<p class="mt-4 text-sm">{data.profile.bio}</p>
	{/if}

	<div class="mt-5 flex gap-2">
		<a href="/profilo/modifica" class="btn btn-ghost flex-1 text-sm">
			<Icon name="settings" size={18} />
			Modifica profilo
		</a>
		{#if data.profile.username}
			<a href="/u/{data.profile.username}" class="btn btn-ghost flex-1 text-sm">
				<Icon name="eye" size={18} />
				Vedi come pubblico
			</a>
		{/if}
	</div>
</section>

<!-- Numeri: etichette per esteso, niente icone da decifrare. -->
<section class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="I tuoi numeri">
	{#each [{ n: data.stats.total, l: 'pillole scritte', href: '/libreria?filtro=mine' }, { n: data.stats.published, l: 'pubbliche', href: null }, { n: data.stats.saved, l: 'salvate', href: '/libreria?filtro=saved' }, { n: data.stats.followers, l: 'follower', href: data.profile.username ? `/u/${data.profile.username}/follower` : null }, { n: data.stats.following, l: 'seguiti', href: data.profile.username ? `/u/${data.profile.username}/seguiti` : null }] as stat (stat.l)}
		<svelte:element
			this={stat.href ? 'a' : 'div'}
			href={stat.href}
			class="card flex min-h-20 flex-col justify-center p-3"
			role={stat.href ? undefined : 'group'}
		>
			<span class="text-2xl font-extrabold" style="font-family:var(--font-display)">{stat.n}</span>
			<span class="text-sm" style="color:var(--c-fg-muted)">{stat.l}</span>
		</svelte:element>
	{/each}
</section>

<section class="mt-6 space-y-2">
	<a href="/profilo/sicurezza" class="card flex min-h-14 items-center gap-3 px-4">
		<Icon name="key" size={20} />
		<span class="flex-1 font-bold">Account e sicurezza</span>
		<Icon name="chevron-right" size={18} />
	</a>

	<a href="/profilo/impostazioni" class="card flex min-h-14 items-center gap-3 px-4">
		<Icon name="settings" size={20} />
		<span class="flex-1 font-bold">Impostazioni</span>
		<Icon name="chevron-right" size={18} />
	</a>

	<button
		type="button"
		onclick={signOut}
		disabled={signingOut}
		class="card flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 text-left"
	>
		<Icon name="logout" size={20} />
		<span class="flex-1 font-bold">{signingOut ? 'Esco…' : 'Esci'}</span>
	</button>
</section>

<section class="card mt-6 p-5 text-center">
	<p class="mb-3 text-sm" style="color:var(--c-fg-muted)">Ti piace Pillole?</p>
	<a href="https://www.buymeacoffee.com/giuuug" target="_blank" rel="noopener noreferrer">
		<img
			src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=giuuug&button_colour=FF5F5F&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"
			alt="Offrimi un caffè su Buy Me a Coffee"
			class="mx-auto"
			loading="lazy"
		/>
	</a>

	<!-- Instagram arriverà qui in futuro: stesso stile, stesso contenitore flex. -->
	<div class="mt-4 flex justify-center gap-2">
		<a
			href="https://t.me/+WA2bAK7DPYVkYzU0"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Unisciti al nostro canale Telegram"
			class="flex min-h-11 min-w-11 items-center justify-center rounded-full"
			style="background:var(--c-surface-2)"
		>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				aria-hidden="true"
				focusable="false"
				fill="#26A5E4"
			>
				<path
					d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
				/>
			</svg>
		</a>
	</div>
</section>
