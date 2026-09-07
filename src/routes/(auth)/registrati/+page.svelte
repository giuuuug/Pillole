<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { signUpSchema } from '$lib/domain/validation';
	import FormField from '$lib/components/FormField.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import SocialButtons from '$lib/components/SocialButtons.svelte';

	let { data } = $props();

	let form = $state({
		firstName: '',
		lastName: '',
		username: '',
		email: '',
		birthDate: '',
		password: ''
	});

	let errors = $state<Record<string, string>>({});
	let formError = $state('');
	let showPwd = $state(false);
	let submitting = $state(false);
	let acceptedTerms = $state(false);
	let termsError = $state('');

	/**
	 * Validazione al blur, non a ogni tasto: correggere qualcuno mentre
	 * sta ancora scrivendo il proprio indirizzo e' solo fastidioso.
	 */
	function validateField(field: keyof typeof form) {
		const shape = signUpSchema.shape[field];
		const result = shape.safeParse(form[field]);
		if (result.success) {
			const rest = { ...errors };
			delete rest[field];
			errors = rest;
		} else {
			errors = { ...errors, [field]: result.error.issues[0].message };
		}
	}

	/**
	 * OWASP A05 — un errore letto male è quasi un misconfiguration: prima
	 * girava su `error.status === 422` (mai vero per la registrazione: Better
	 * Auth risponde sempre 400 qui) e su un `/username/i` che intercettava
	 * ANCHE "Username is too long" o "too short", mostrando "già preso" per
	 * ogni errore che nominasse lo username. Il codice strutturato che Better
	 * Auth restituisce è l'unica cosa affidabile su cui decidere.
	 */
	const USERNAME_TAKEN_CODES = new Set(['USERNAME_IS_ALREADY_TAKEN']);
	const EMAIL_TAKEN_CODES = new Set([
		'USER_ALREADY_EXISTS',
		'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
	]);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		formError = '';
		termsError = '';
		// Un errore rimasto da un tentativo precedente (es. "già preso" su uno
		// username poi cambiato) non deve restare visibile per sempre.
		errors = {};

		const parsed = signUpSchema.safeParse(form);
		if (!parsed.success) {
			errors = Object.fromEntries(
				parsed.error.issues.map((i) => [i.path.join('.') || '_', i.message])
			);
			const first = document.querySelector<HTMLElement>(`#${Object.keys(errors)[0]}`);
			first?.focus();
			return;
		}

		if (!acceptedTerms) {
			termsError = 'Devi accettare i Termini di servizio e l’Informativa sulla privacy';
			document.querySelector<HTMLElement>('#acceptedTerms')?.focus();
			return;
		}

		submitting = true;

		const { error } = await authClient.signUp.email({
			email: parsed.data.email,
			password: parsed.data.password,
			username: parsed.data.username,
			name: `${parsed.data.firstName} ${parsed.data.lastName}`,
			firstName: parsed.data.firstName,
			lastName: parsed.data.lastName,
			birthDate: parsed.data.birthDate
		});

		submitting = false;

		if (error) {
			const code = (error as { code?: string }).code ?? '';
			if (USERNAME_TAKEN_CODES.has(code)) {
				errors = { ...errors, username: 'Questo username è già preso' };
			} else if (EMAIL_TAKEN_CODES.has(code)) {
				errors = { ...errors, email: 'Esiste già un account con questa email' };
			} else if (error.status === 429) {
				formError = 'Troppi tentativi. Riprova fra qualche minuto.';
			} else {
				formError = 'Registrazione non riuscita. Riprova fra qualche istante.';
			}
			return;
		}

		await invalidateAll();
		await goto('/profilo?benvenuto=1');
	}

	const maxBirthDate = new Date().toISOString().slice(0, 10);
</script>

<svelte:head>
	<title>Registrati — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="card p-6">
	<h1 class="text-2xl">Crea il tuo account</h1>
	<p class="mt-1 mb-6 text-sm" style="color:var(--c-fg-muted)">
		Gratis, senza pubblicità. Le tue pillole restano private finché non decidi tu.
	</p>

	<SocialButtons providers={data.providers} callbackURL="/profilo/modifica" />

	{#if data.providers.google || data.providers.apple}
		<p class="-mt-3 mb-5 text-center text-xs" style="color:var(--c-fg-muted)">
			Continuando con Google o Apple accetti i
			<a href="/termini" target="_blank" class="font-bold underline underline-offset-2"
				>Termini di servizio</a
			>
			e l'
			<a href="/privacy" target="_blank" class="font-bold underline underline-offset-2"
				>Informativa sulla privacy</a
			>.
		</p>
	{/if}

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

		<div class="grid gap-4 sm:grid-cols-2">
			<FormField id="firstName" label="Nome" error={errors.firstName}>
				{#snippet children(a)}
					<input
						id="firstName"
						class="input"
						bind:value={form.firstName}
						onblur={() => validateField('firstName')}
						autocomplete="given-name"
						{...a}
					/>
				{/snippet}
			</FormField>
			<FormField id="lastName" label="Cognome" error={errors.lastName}>
				{#snippet children(a)}
					<input
						id="lastName"
						class="input"
						bind:value={form.lastName}
						onblur={() => validateField('lastName')}
						autocomplete="family-name"
						{...a}
					/>
				{/snippet}
			</FormField>
		</div>

		<FormField
			id="username"
			label="Username pubblico"
			error={errors.username}
			hint="È il nome con cui gli altri ti trovano. Puoi cambiarlo dopo."
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
						bind:value={form.username}
						onblur={() => validateField('username')}
						autocomplete="username"
						autocapitalize="none"
						spellcheck="false"
						{...a}
					/>
				</div>
			{/snippet}
		</FormField>

		<FormField id="email" label="Email" error={errors.email}>
			{#snippet children(a)}
				<input
					id="email"
					type="email"
					class="input"
					bind:value={form.email}
					onblur={() => validateField('email')}
					autocomplete="email"
					autocapitalize="none"
					spellcheck="false"
					inputmode="email"
					{...a}
				/>
			{/snippet}
		</FormField>

		<FormField
			id="birthDate"
			label="Data di nascita"
			error={errors.birthDate}
			hint="Non la mostriamo a nessuno. Serve solo per l’età minima (14 anni)."
		>
			{#snippet children(a)}
				<input
					id="birthDate"
					type="date"
					class="input"
					bind:value={form.birthDate}
					onblur={() => validateField('birthDate')}
					max={maxBirthDate}
					autocomplete="bday"
					{...a}
				/>
			{/snippet}
		</FormField>

		<PasswordField
			id="password"
			label="Password"
			bind:value={form.password}
			bind:show={showPwd}
			onblur={() => validateField('password')}
			autocomplete="new-password"
			error={errors.password}
			hint="Almeno 10 caratteri. Tre parole a caso funzionano benissimo."
		/>

		<div>
			<label class="flex cursor-pointer items-start gap-3">
				<input
					id="acceptedTerms"
					type="checkbox"
					class="mt-0.5 h-5 w-5 shrink-0 cursor-pointer"
					bind:checked={acceptedTerms}
					onchange={() => acceptedTerms && (termsError = '')}
					aria-invalid={termsError ? 'true' : undefined}
					aria-describedby={termsError ? 'err-terms' : undefined}
				/>
				<span class="text-sm">
					Ho letto e accetto i
					<a href="/termini" target="_blank" class="font-bold underline underline-offset-2"
						>Termini di servizio</a
					>
					e l'
					<a href="/privacy" target="_blank" class="font-bold underline underline-offset-2"
						>Informativa sulla privacy</a
					>.
				</span>
			</label>
			{#if termsError}
				<p id="err-terms" class="mt-1.5 ml-8 text-sm font-bold" style="color:var(--c-danger)">
					{termsError}
				</p>
			{/if}
		</div>

		<button type="submit" class="btn btn-primary w-full" disabled={submitting}>
			{submitting ? 'Creo l’account…' : 'Crea account'}
		</button>
	</form>

	<p class="mt-6 text-center text-sm">
		Hai già un account?
		<a href="/accedi" class="font-bold underline underline-offset-2">Accedi</a>
	</p>
</div>
