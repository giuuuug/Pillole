<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import FormField from '$lib/components/FormField.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import SocialButtons from '$lib/components/SocialButtons.svelte';

	let { data } = $props();

	let identifier = $state('');
	let password = $state('');
	let showPwd = $state(false);
	let submitting = $state(false);
	let formError = $state('');

	// Solo un percorso relativo interno: un `next` verso l'esterno sarebbe
	// un open redirect (OWASP A01).
	const next = $derived.by(() => {
		const raw = page.url.searchParams.get('next') ?? '/';
		return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!identifier.trim() || !password) {
			formError = 'Inserisci email (o username) e password.';
			return;
		}

		submitting = true;

		const isEmail = identifier.includes('@');
		const { error } = isEmail
			? await authClient.signIn.email({ email: identifier.trim().toLowerCase(), password })
			: await authClient.signIn.username({ username: identifier.trim().toLowerCase(), password });

		submitting = false;

		if (error) {
			// Messaggio identico per email inesistente e password sbagliata:
			// altrimenti si puo' capire quali email sono registrate.
			formError =
				error.status === 429
					? 'Troppi tentativi. Riprova fra qualche minuto.'
					: 'Credenziali non corrette. Controlla e riprova.';
			return;
		}

		await invalidateAll();
		await goto(next);
	}
</script>

<svelte:head>
	<title>Accedi — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="card p-6">
	<h1 class="text-2xl">Bentornato</h1>
	<p class="mt-1 mb-6 text-sm" style="color:var(--c-fg-muted)">Le tue pillole ti aspettano.</p>

	<SocialButtons providers={data.providers} callbackURL={next} />

	<form onsubmit={submit} novalidate class="space-y-4">
		{#if formError}
			<div
				class="rounded-xl border p-3 text-sm font-bold"
				style="background:var(--c-danger-soft);border-color:var(--c-danger);color:var(--c-danger)"
				role="alert"
			>
				{formError}
			</div>
		{/if}

		<FormField id="identificativo" label="Email o username">
			{#snippet children(a)}
				<input
					id="identificativo"
					class="input"
					bind:value={identifier}
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					enterkeyhint="next"
					{...a}
				/>
			{/snippet}
		</FormField>

		<div>
			<PasswordField
				id="password"
				label="Password"
				bind:value={password}
				bind:show={showPwd}
				autocomplete="current-password"
			/>
			<a
				href="/password-dimenticata"
				class="mt-2 inline-block text-sm font-bold underline underline-offset-2"
			>
				Ho dimenticato la password
			</a>
		</div>

		<button type="submit" class="btn btn-primary w-full" disabled={submitting}>
			{submitting ? 'Accedo…' : 'Accedi'}
		</button>
	</form>

	<p class="mt-6 text-center text-sm">
		Non hai un account?
		<a href="/registrati" class="font-bold underline underline-offset-2">Registrati</a>
	</p>
</div>
