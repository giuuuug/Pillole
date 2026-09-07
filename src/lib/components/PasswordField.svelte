<script lang="ts">
	import Icon from './Icon.svelte';

	/**
	 * Campo password con l'occhiolino mostra/nascondi — ripetuto uguale in
	 * accedi, registrati, impostazioni e reimposta-password. Mostrare la
	 * password è una misura di accessibilità (chi ha difficoltà motorie o
	 * visive sbaglia e riprova alla cieca), non un vezzo.
	 *
	 * `show` è bindable: due campi che devono mostrarsi/nascondersi insieme
	 * (es. "nuova password" + "ripeti password") condividono la stessa
	 * variabile — ognuno resta comunque un pulsante indipendente se non la
	 * condividi.
	 */
	type Props = {
		id: string;
		label: string;
		value: string;
		error?: string;
		hint?: string;
		autocomplete?: 'current-password' | 'new-password';
		show?: boolean;
		onblur?: () => void;
	};

	let {
		id,
		label,
		value = $bindable(),
		error,
		hint,
		autocomplete = 'current-password',
		show = $bindable(false),
		onblur
	}: Props = $props();

	const describedById = $derived(error ? `err-${id}` : hint ? `hint-${id}` : undefined);
</script>

<div>
	<label class="label" for={id}>{label}</label>
	<div class="relative">
		<input
			{id}
			type={show ? 'text' : 'password'}
			class="input !pr-12"
			bind:value
			{autocomplete}
			{onblur}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedById}
		/>
		<button
			type="button"
			class="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg"
			onclick={() => (show = !show)}
			aria-label={show ? 'Nascondi la password' : 'Mostra la password'}
			aria-pressed={show}
		>
			<Icon name={show ? 'eye-off' : 'eye'} size={19} />
		</button>
	</div>
	{#if error}
		<p id={describedById} class="mt-1.5 text-sm font-bold" style="color:var(--c-danger)">
			{error}
		</p>
	{:else if hint}
		<p id={describedById} class="mt-1.5 text-sm" style="color:var(--c-fg-muted)">
			{hint}
		</p>
	{/if}
</div>
