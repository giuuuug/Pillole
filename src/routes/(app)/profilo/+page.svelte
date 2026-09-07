<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { toast } from '$lib/client/toast.svelte';
	import { computeAge } from '$lib/domain/validation';
	import Avatar from '$lib/components/Avatar.svelte';
	import Badge from '$lib/components/Badge.svelte';
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
			<p
				class="flex items-center gap-1.5 truncate text-xl font-extrabold"
				style="font-family:var(--font-display)"
			>
				{data.user?.name}
				<Badge id={data.profile.badge} size={18} />
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

	<div class="mt-4 flex justify-center gap-2">
		<a
			href="https://www.instagram.com/pillole_di_conoscenza?stkn=NGx3czdua3doN3Ji&utm_source=qr"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Seguici su Instagram"
			class="flex min-h-11 min-w-11 items-center justify-center rounded-full"
			style="background:var(--c-surface-2)"
		>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				aria-hidden="true"
				focusable="false"
				fill="#E4405F"
			>
				<path
					d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56a5.9 5.9 0 0 0-2.13 1.39A5.9 5.9 0 0 0 .62 4.14C.32 4.9.12 5.77.06 7.05.01 8.33 0 8.74 0 12s.01 3.67.06 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13a5.9 5.9 0 0 0 2.13 1.39c.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.06c1.28-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.39 5.9 5.9 0 0 0 1.39-2.13c.3-.76.5-1.63.56-2.91.05-1.28.06-1.69.06-4.95s-.01-3.67-.06-4.95c-.06-1.28-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.39-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"
				/>
			</svg>
		</a>

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

		<a
			href="https://github.com/giuuuug/Pillole"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Il repository di Pillole su GitHub"
			class="flex min-h-11 min-w-11 items-center justify-center rounded-full"
			style="background:var(--c-surface-2)"
		>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				aria-hidden="true"
				focusable="false"
				fill="#181717"
			>
				<path
					d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.15c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.07.78 2.15v3.19c0 .3.21.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"
				/>
			</svg>
		</a>
	</div>
</section>
