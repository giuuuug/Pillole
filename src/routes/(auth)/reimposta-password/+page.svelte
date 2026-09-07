<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { toast } from '$lib/client/toast.svelte';
	import { passwordSchema } from '$lib/domain/validation';
	import PasswordField from '$lib/components/PasswordField.svelte';

	let next = $state('');
	let confirm = $state('');
	let showPwd = $state(false);
	let submitting = $state(false);
	let errors = $state<Record<string, string>>({});

	const token = $derived(page.url.searchParams.get('token') ?? '');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errors = {};

		const parsed = passwordSchema.safeParse(next);
		if (!parsed.success) {
			errors.next = parsed.error.issues[0].message;
			return;
		}
		if (next !== confirm) {
			errors.confirm = 'Le due password non coincidono';
			return;
		}

		submitting = true;
		const { error } = await authClient.resetPassword({ newPassword: next, token });
		submitting = false;

		if (error) {
			errors.next = 'Il link non è più valido. Richiedine uno nuovo.';
			return;
		}

		toast.success('Password aggiornata. Ora puoi accedere.');
		await goto('/accedi');
	}
</script>

<svelte:head>
	<title>Nuova password — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="card p-6">
	{#if !token}
		<h1 class="text-2xl">Link non valido</h1>
		<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">
			Questo link è scaduto o incompleto. Richiedine uno nuovo.
		</p>
		<a href="/password-dimenticata" class="btn btn-primary mt-6 w-full">Richiedi un nuovo link</a>
	{:else}
		<h1 class="text-2xl">Scegli una nuova password</h1>
		<p class="mt-1 mb-6 text-sm" style="color:var(--c-fg-muted)">
			Dopo il cambio, tutte le altre sessioni verranno chiuse.
		</p>

		<form onsubmit={submit} novalidate class="space-y-4">
			<PasswordField
				id="nuova"
				label="Nuova password"
				bind:value={next}
				bind:show={showPwd}
				autocomplete="new-password"
				error={errors.next}
				hint="Almeno 10 caratteri."
			/>

			<PasswordField
				id="conferma"
				label="Ripeti la password"
				bind:value={confirm}
				bind:show={showPwd}
				autocomplete="new-password"
				error={errors.confirm}
			/>

			<button type="submit" class="btn btn-primary w-full" disabled={submitting}>
				{submitting ? 'Aggiorno…' : 'Salva la nuova password'}
			</button>
		</form>
	{/if}
</div>
