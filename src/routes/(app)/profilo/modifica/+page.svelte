<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/client/toast.svelte';
	import { profileUpdateSchema } from '$lib/domain/validation';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let profile = $state({ ...data.profile });
	let profileErrors = $state<Record<string, string>>({});
	let savingProfile = $state(false);

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
