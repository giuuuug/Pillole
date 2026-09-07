<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let email = $state('');
	let sent = $state(false);
	let submitting = $state(false);
	let fieldError = $state('');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		fieldError = '';

		if (!email.includes('@')) {
			fieldError = 'Inserisci un indirizzo email valido.';
			return;
		}

		submitting = true;
		await authClient.requestPasswordReset({
			email: email.trim().toLowerCase(),
			redirectTo: '/reimposta-password'
		});
		submitting = false;

		// Confermiamo sempre, anche se l'email non esiste: altrimenti questa
		// pagina diventa un modo per scoprire chi e' registrato (OWASP A07).
		sent = true;
	}
</script>

<svelte:head>
	<title>Password dimenticata — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="card p-6">
	{#if sent}
		<div class="text-center">
			<span
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
				style="background:var(--c-primary-soft);color:var(--c-primary-text)"
			>
				<Icon name="mail" size={26} />
			</span>
			<h1 class="text-2xl">Controlla la posta</h1>
			<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">
				Se esiste un account per <strong>{email}</strong>, ti abbiamo mandato un link per
				reimpostare la password. Vale un’ora.
			</p>
			<a href="/accedi" class="btn btn-ghost mt-6 w-full">Torna all’accesso</a>
		</div>
	{:else}
		<h1 class="text-2xl">Password dimenticata</h1>
		<p class="mt-1 mb-6 text-sm" style="color:var(--c-fg-muted)">
			Scrivi la tua email: ti mandiamo un link per sceglierne una nuova.
		</p>

		<form onsubmit={submit} novalidate class="space-y-4">
			<FormField id="email" label="Email" error={fieldError}>
				{#snippet children(a)}
					<input
						id="email"
						type="email"
						class="input"
						bind:value={email}
						autocomplete="email"
						inputmode="email"
						autocapitalize="none"
						{...a}
					/>
				{/snippet}
			</FormField>

			<button type="submit" class="btn btn-primary w-full" disabled={submitting}>
				{submitting ? 'Invio…' : 'Mandami il link'}
			</button>
		</form>

		<p class="mt-6 text-center text-sm">
			<a href="/accedi" class="font-bold underline underline-offset-2">Torna all’accesso</a>
		</p>
	{/if}
</div>
