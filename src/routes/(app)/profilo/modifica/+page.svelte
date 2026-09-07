<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/client/toast.svelte';
	import { profileUpdateSchema } from '$lib/domain/validation';
	import { AVATAR_IDS, AVATAR_PATHS, avatarPath } from '$lib/domain/avatars';
	import Avatar from '$lib/components/Avatar.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let profile = $state({ ...data.profile });
	let profileErrors = $state<Record<string, string>>({});
	let savingProfile = $state(false);

	/* --- Avatar --- */
	// svelte-ignore state_referenced_locally
	let currentImage = $state(data.profile.image);
	let savingAvatar = $state(false);

	// Anteprima grande prima di confermare: le miniature sono piccole (56px),
	// difficili da distinguere per chi ha poca vista — si sceglie guardando
	// una versione ingrandita, non le miniature stesse.
	let previewing = $state<{ path: string | null; label: string } | null>(null);
	let previewDialog: HTMLDialogElement | undefined;

	$effect(() => {
		if (previewing) {
			previewDialog?.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			previewDialog?.close();
			document.body.style.overflow = '';
		}
	});

	function openPreview(path: string | null, label: string) {
		previewing = { path, label };
	}

	async function confirmAvatar() {
		if (!previewing || savingAvatar) return;
		const path = previewing.path;
		previewing = null;

		if (path === currentImage) return;
		const previous = currentImage;
		currentImage = path;
		savingAvatar = true;

		try {
			const res = await fetch('/api/profilo/avatar', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ image: path })
			});
			if (!res.ok) throw new Error();
			await invalidateAll();
			toast.success('Avatar aggiornato');
		} catch {
			currentImage = previous;
			toast.error('Non è stato possibile cambiare avatar. Riprova.');
		} finally {
			savingAvatar = false;
		}
	}

	function avatarLabel(id: string): string {
		return id
			.split('_')
			.map((w) => w[0].toUpperCase() + w.slice(1))
			.join(' ');
	}

	// Un solo "radio" del gruppo e' raggiungibile col Tab (roving tabindex,
	// ARIA Authoring Practices): quello selezionato, o il primo se l'immagine
	// attuale non e' una delle opzioni note (es. una foto Google/Apple).
	const knownSelection = $derived(currentImage === null || AVATAR_PATHS.includes(currentImage));

	function radioTabIndex(path: string | null): number {
		if (currentImage === path) return 0;
		if (!knownSelection && path === null) return 0;
		return -1;
	}

	/**
	 * Frecce/Home/End spostano il focus fra i "radio" (pattern ARIA radiogroup).
	 * Ascolta sul singolo bottone che ha il focus, non sul contenitore: il
	 * `role="radiogroup"` non deve essere lui stesso focalizzabile, solo i
	 * "radio" al suo interno (roving tabindex).
	 */
	function handleAvatarGroupKeydown(event: KeyboardEvent) {
		const NAV_KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
		if (!NAV_KEYS.includes(event.key)) return;

		const container = (event.currentTarget as HTMLElement).closest<HTMLElement>(
			'[role="radiogroup"]'
		);
		if (!container) return;
		const radios = Array.from(
			container.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')
		);
		if (radios.length === 0) return;

		const current = radios.indexOf(document.activeElement as HTMLButtonElement);
		let next = current;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			next = (current + 1 + radios.length) % radios.length;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			next = (current - 1 + radios.length) % radios.length;
		} else if (event.key === 'Home') {
			next = 0;
		} else if (event.key === 'End') {
			next = radios.length - 1;
		}

		event.preventDefault();
		radios[next]?.focus();
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		profileErrors = {};

		const parsed = profileUpdateSchema.safeParse(profile);
		if (!parsed.success) {
			profileErrors = Object.fromEntries(
				parsed.error.issues.map((i) => [i.path.join('.') || '_', i.message])
			);
			return;
		}

		savingProfile = true;
		try {
			const res = await fetch('/api/profilo', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(parsed.data)
			});

			if (res.status === 409 || res.status === 422) {
				profileErrors = ((await res.json()) as { fields?: Record<string, string> }).fields ?? {};
				return;
			}
			if (!res.ok) throw new Error();

			await invalidateAll();
			toast.success('Profilo aggiornato');
		} catch {
			toast.error('Salvataggio non riuscito. Riprova.');
		} finally {
			savingProfile = false;
		}
	}
</script>

<svelte:head>
	<title>Modifica profilo — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/profilo" class="btn btn-ghost mb-4 text-sm">
	<Icon name="chevron-left" size={18} />
	Profilo
</a>

<h1 class="mb-6 text-2xl sm:text-3xl">Modifica profilo</h1>

<section class="card mb-4 p-5" aria-labelledby="sez-avatar">
	<h2 id="sez-avatar" class="text-lg">Avatar</h2>
	<p class="mt-1 text-sm" style="color:var(--c-fg-muted)">
		Scegline uno, oppure resta con le iniziali generate dal tuo nome.
	</p>

	<div class="mt-4 flex flex-wrap gap-3" role="radiogroup" aria-label="Scegli un avatar">
		<button
			type="button"
			role="radio"
			aria-checked={currentImage === null}
			aria-label="Nessun avatar: usa le iniziali. Apre un'anteprima grande."
			tabindex={radioTabIndex(null)}
			disabled={savingAvatar}
			onclick={() => openPreview(null, data.profile.firstName || 'Le tue iniziali')}
			onkeydown={handleAvatarGroupKeydown}
			class="rounded-full"
			style={currentImage === null ? 'outline:2px solid var(--c-ring);outline-offset:2px' : ''}
		>
			<Avatar name={data.profile.firstName} size={56} />
		</button>

		{#each AVATAR_IDS as id (id)}
			{@const path = avatarPath(id)}
			<button
				type="button"
				role="radio"
				aria-checked={currentImage === path}
				aria-label="{avatarLabel(id)}. Apre un'anteprima grande."
				tabindex={radioTabIndex(path)}
				disabled={savingAvatar}
				onclick={() => openPreview(path, avatarLabel(id))}
				onkeydown={handleAvatarGroupKeydown}
				class="rounded-full"
				style={currentImage === path ? 'outline:2px solid var(--c-ring);outline-offset:2px' : ''}
			>
				<Avatar name={id} image={path} size={56} />
			</button>
		{/each}
	</div>
</section>

<section class="card p-5" aria-labelledby="sez-profilo">
	<h2 id="sez-profilo" class="sr-only">I tuoi dati</h2>

	<form onsubmit={saveProfile} novalidate class="space-y-4">
		<div class="grid gap-4 sm:grid-cols-2">
			<FormField id="nome" label="Nome" error={profileErrors.firstName}>
				{#snippet children(a)}
					<input
						id="nome"
						class="input"
						bind:value={profile.firstName}
						autocomplete="given-name"
						{...a}
					/>
				{/snippet}
			</FormField>
			<FormField id="cognome" label="Cognome" error={profileErrors.lastName}>
				{#snippet children(a)}
					<input
						id="cognome"
						class="input"
						bind:value={profile.lastName}
						autocomplete="family-name"
						{...a}
					/>
				{/snippet}
			</FormField>
		</div>

		<FormField
			id="username"
			label="Username pubblico"
			error={profileErrors.username}
			hint="È il nome con cui gli altri ti trovano nel feed. Minuscole, numeri, punto e underscore."
		>
			{#snippet children(a)}
				<div class="relative">
					<span
						class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-bold"
						style="color:var(--c-fg-muted)">@</span
					>
					<input
						id="username"
						class="input !pl-8"
						bind:value={profile.username}
						autocapitalize="none"
						autocomplete="username"
						spellcheck="false"
						{...a}
					/>
				</div>
			{/snippet}
		</FormField>

		<FormField
			id="nascita"
			label="Data di nascita"
			error={profileErrors.birthDate}
			hint="Resta privata: serve solo a verificare l’età minima."
		>
			{#snippet children(a)}
				<input
					id="nascita"
					type="date"
					class="input"
					bind:value={profile.birthDate}
					max={new Date().toISOString().slice(0, 10)}
					autocomplete="bday"
					{...a}
				/>
			{/snippet}
		</FormField>

		<FormField id="bio" label="Due righe su di te (facoltative)" hint="{profile.bio.length}/280">
			{#snippet children(a)}
				<textarea
					id="bio"
					class="input resize-y"
					rows="3"
					maxlength="280"
					bind:value={profile.bio}
					placeholder="Cosa ti appassiona?"
					{...a}></textarea>
			{/snippet}
		</FormField>

		<button type="submit" class="btn btn-primary" disabled={savingProfile}>
			{savingProfile ? 'Salvo…' : 'Salva le modifiche'}
		</button>
	</form>
</section>

<dialog
	bind:this={previewDialog}
	class="dialog-reset w-full max-w-xs rounded-2xl p-0"
	aria-labelledby="anteprima-avatar-titolo"
	onclose={() => (previewing = null)}
>
	{#if previewing}
		<div class="card w-full p-6 text-center">
			<h2 id="anteprima-avatar-titolo" class="text-lg">Anteprima</h2>
			<div class="mt-4 flex justify-center">
				<Avatar name={previewing.label} image={previewing.path} size={140} />
			</div>
			<p class="mt-3 font-bold">{previewing.label}</p>
			<p class="mt-1 text-sm" style="color:var(--c-fg-muted)">
				Così apparirà il tuo avatar nel profilo e sulle tue pillole.
			</p>

			<div class="mt-5 flex gap-2">
				<!-- svelte-ignore a11y_autofocus -->
				<button
					type="button"
					class="btn btn-ghost flex-1"
					onclick={() => (previewing = null)}
					autofocus
				>
					Annulla
				</button>
				<button type="button" class="btn btn-primary flex-1" onclick={confirmAvatar}>
					Usa questo avatar
				</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.dialog-reset {
		margin: auto;
		border: none;
		background: transparent;
	}
	.dialog-reset::backdrop {
		background: rgb(0 0 0 / 50%);
	}
</style>
