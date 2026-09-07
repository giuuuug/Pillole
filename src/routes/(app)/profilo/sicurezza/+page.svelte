<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { toast } from '$lib/client/toast.svelte';
	import { passwordSchema, signUpSchema } from '$lib/domain/validation';
	import Icon from '$lib/components/Icon.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';

	let { data } = $props();

	/* --- Cambia email --- */
	let newEmail = $state('');
	let emailError = $state('');
	let changingEmail = $state(false);

	async function changeEmail(event: SubmitEvent) {
		event.preventDefault();
		emailError = '';

		const parsed = signUpSchema.shape.email.safeParse(newEmail);
		if (!parsed.success) {
			emailError = parsed.error.issues[0].message;
			return;
		}

		changingEmail = true;
		const { error } = await authClient.changeEmail({
			newEmail: parsed.data,
			callbackURL: '/profilo/sicurezza'
		});
		changingEmail = false;

		if (error) {
			emailError = 'Non è stato possibile cambiare email. Riprova.';
			return;
		}

		newEmail = '';
		await invalidateAll();
		toast.success('Email aggiornata');
	}

	/* --- Password --- */
	let pwd = $state({ current: '', next: '', confirm: '' });
	let pwdErrors = $state<Record<string, string>>({});
	let changingPwd = $state(false);
	let showPwd = $state(false);

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		pwdErrors = {};

		const parsed = passwordSchema.safeParse(pwd.next);
		if (!parsed.success) {
			pwdErrors.next = parsed.error.issues[0].message;
			return;
		}
		if (pwd.next !== pwd.confirm) {
			pwdErrors.confirm = 'Le due password non coincidono';
			return;
		}

		changingPwd = true;
		const { error } = await authClient.changePassword({
			currentPassword: pwd.current,
			newPassword: pwd.next,
			// Chi conosceva la vecchia password viene disconnesso ovunque:
			// se qualcuno era entrato, esce.
			revokeOtherSessions: true
		});
		changingPwd = false;

		if (error) {
			pwdErrors.current = 'Password attuale non corretta';
			return;
		}

		pwd = { current: '', next: '', confirm: '' };
		toast.success('Password aggiornata. Le altre sessioni sono state chiuse.');
	}

	/* --- Chiudi account --- */
	let confirmingDelete = $state(false);
	let deleteDialog: HTMLDialogElement | undefined;
	let deletePassword = $state('');
	let deleteError = $state('');
	let deleting = $state(false);

	$effect(() => {
		if (confirmingDelete) {
			deleteDialog?.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			deleteDialog?.close();
			document.body.style.overflow = '';
		}
	});

	async function deleteAccount(event: SubmitEvent) {
		event.preventDefault();
		deleteError = '';
		deleting = true;

		const { error } = await authClient.deleteUser(
			data.hasPassword ? { password: deletePassword } : {}
		);
		deleting = false;

		if (error) {
			deleteError = 'Password errata o operazione non riuscita.';
			return;
		}

		await goto('/');
		toast.success('Account chiuso. Ci dispiace vederti andare via.');
	}

	const PROVIDER_LABELS: Record<string, string> = { google: 'Google', apple: 'Apple' };
</script>

<svelte:head>
	<title>Account e sicurezza — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/profilo" class="btn btn-ghost mb-4 text-sm">
	<Icon name="chevron-left" size={18} />
	Profilo
</a>

<h1 class="mb-6 text-2xl sm:text-3xl">Account e sicurezza</h1>

<!-- Email -->
<section class="card mb-4 p-5" aria-labelledby="sez-email">
	<h2 id="sez-email" class="text-lg">Email</h2>
	<p class="mt-1 text-sm" style="color:var(--c-fg-muted)">{data.email}</p>

	{#if data.linkedProviders.length > 0}
		<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">
			Accessi collegati: {data.linkedProviders.map((p) => PROVIDER_LABELS[p] ?? p).join(', ')}
		</p>
	{/if}

	<form onsubmit={changeEmail} novalidate class="mt-4 flex flex-wrap items-end gap-3">
		<div class="min-w-0 flex-1">
			<label for="nuova-email" class="mb-1 block text-sm font-bold">Nuova email</label>
			<input
				id="nuova-email"
				type="email"
				class="input"
				bind:value={newEmail}
				autocomplete="email"
				aria-invalid={emailError ? 'true' : undefined}
				aria-describedby={emailError ? 'nuova-email-errore' : undefined}
			/>
			{#if emailError}
				<p id="nuova-email-errore" class="mt-1 text-sm" style="color:var(--c-danger)">
					{emailError}
				</p>
			{/if}
		</div>
		<button type="submit" class="btn btn-primary" disabled={changingEmail}>
			{changingEmail ? 'Aggiorno…' : 'Cambia email'}
		</button>
	</form>
</section>

<!-- Password -->
{#if data.hasPassword}
	<section class="card mb-4 p-5" aria-labelledby="sez-password">
		<h2 id="sez-password" class="mb-4 text-lg">Cambia password</h2>

		<form onsubmit={changePassword} novalidate class="space-y-4">
			<PasswordField
				id="pwd-attuale"
				label="Password attuale"
				bind:value={pwd.current}
				bind:show={showPwd}
				error={pwdErrors.current}
			/>

			<PasswordField
				id="pwd-nuova"
				label="Nuova password"
				bind:value={pwd.next}
				bind:show={showPwd}
				autocomplete="new-password"
				error={pwdErrors.next}
				hint="Almeno 10 caratteri. Una frase che ricordi vale più di simboli a caso."
			/>

			<PasswordField
				id="pwd-conferma"
				label="Ripeti la nuova password"
				bind:value={pwd.confirm}
				bind:show={showPwd}
				autocomplete="new-password"
				error={pwdErrors.confirm}
			/>

			<button type="submit" class="btn btn-primary" disabled={changingPwd}>
				{changingPwd ? 'Aggiorno…' : 'Aggiorna password'}
			</button>
		</form>
	</section>
{/if}

<!-- Chiudi account -->
<section class="card p-5" style="border-color:var(--c-danger)" aria-labelledby="sez-elimina">
	<h2 id="sez-elimina" class="text-lg" style="color:var(--c-danger)">Chiudi il tuo account</h2>
	<p class="mt-1 text-sm" style="color:var(--c-fg-muted)">
		Le tue pillole, i salvataggi e i follower spariscono per sempre. Non si può annullare.
	</p>
	<button type="button" class="btn btn-danger mt-3" onclick={() => (confirmingDelete = true)}>
		<Icon name="trash" size={18} />
		Chiudi account
	</button>
</section>

<dialog
	bind:this={deleteDialog}
	class="dialog-reset w-full max-w-sm rounded-2xl p-0"
	aria-labelledby="conferma-eliminazione-titolo"
	onclose={() => (confirmingDelete = false)}
>
	<div class="card w-full p-5">
		<h2 id="conferma-eliminazione-titolo" class="text-xl">Chiudere l'account per sempre?</h2>
		<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">
			Questa azione è immediata. Tutte le tue pillole, i salvataggi e i follow spariscono per
			sempre, senza possibilità di recupero.
		</p>

		<form onsubmit={deleteAccount} novalidate class="mt-4 space-y-4">
			{#if data.hasPassword}
				<PasswordField
					id="pwd-elimina"
					label="Conferma con la tua password"
					bind:value={deletePassword}
					error={deleteError}
				/>
			{:else if deleteError}
				<p class="text-sm" style="color:var(--c-danger)">{deleteError}</p>
			{/if}

			<div class="flex gap-2">
				<!-- svelte-ignore a11y_autofocus -->
				<button
					type="button"
					class="btn btn-ghost flex-1"
					onclick={() => (confirmingDelete = false)}
					autofocus
				>
					Annulla
				</button>
				<button type="submit" class="btn btn-danger flex-1" disabled={deleting}>
					{deleting ? 'Elimino…' : 'Elimina definitivamente'}
				</button>
			</div>
		</form>
	</div>
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
