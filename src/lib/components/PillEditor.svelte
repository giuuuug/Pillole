<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/client/toast.svelte';
	import { CATEGORIES } from '$lib/domain/categories';
	import { pillInputSchema, type PillInput } from '$lib/domain/validation';
	import FormField from './FormField.svelte';
	import Icon from './Icon.svelte';
	import PillBody from './PillBody.svelte';

	type Props = {
		/** Se presente si sta modificando, altrimenti si crea. */
		pillId?: string;
		initial?: Partial<PillInput>;
		canPublish: boolean;
	};

	let { pillId, initial = {}, canPublish }: Props = $props();

	// svelte-ignore state_referenced_locally
	let title = $state(initial.title ?? '');
	// svelte-ignore state_referenced_locally
	let body = $state(initial.body ?? '');
	// svelte-ignore state_referenced_locally
	let format = $state<'text' | 'latex'>(initial.format ?? 'text');
	// svelte-ignore state_referenced_locally
	let categoryId = $state(initial.categoryId ?? '');
	// svelte-ignore state_referenced_locally
	let isPublic = $state(initial.isPublic ?? false);
	// svelte-ignore state_referenced_locally
	let sources = $state<{ label: string; url: string }[]>(
		initial.sources?.map((s) => ({ label: s.label, url: s.url ?? '' })) ?? []
	);

	let showPreview = $state(false);
	let submitting = $state(false);
	let errors = $state<Record<string, string>>({});
	let bodyEl: HTMLTextAreaElement | undefined = $state();

	const dirty = $derived(
		title !== (initial.title ?? '') || body !== (initial.body ?? '') || sources.length > 0
	);

	function addSource() {
		if (sources.length >= 10) return;
		sources = [...sources, { label: '', url: '' }];
	}

	function removeSource(index: number) {
		sources = sources.filter((_, i) => i !== index);
	}

	/** Inserisce un modello di formula nel punto in cui si trova il cursore. */
	function insertSnippet(snippet: string) {
		const el = bodyEl;
		if (!el) return;
		const start = el.selectionStart;
		const end = el.selectionEnd;
		body = body.slice(0, start) + snippet + body.slice(end);
		format = 'latex';
		// Il cursore torna dentro la formula appena inserita.
		queueMicrotask(() => {
			el.focus();
			const caret = start + snippet.indexOf('...');
			if (caret > start) el.setSelectionRange(caret, caret + 3);
			else el.setSelectionRange(start + snippet.length, start + snippet.length);
		});
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errors = {};

		const payload = {
			title,
			body,
			format,
			categoryId,
			isPublic,
			sources: sources
				.filter((s) => s.label.trim())
				.map((s) => ({ label: s.label.trim(), url: s.url.trim() || undefined }))
		};

		// Validazione con lo STESSO schema del server: nessuna divergenza
		// possibile fra il messaggio che vedi e la regola che passa davvero.
		const parsed = pillInputSchema.safeParse(payload);
		if (!parsed.success) {
			errors = Object.fromEntries(
				parsed.error.issues.map((i) => [i.path.join('.') || '_', i.message])
			);
			focusFirstError();
			return;
		}

		submitting = true;
		try {
			const res = await fetch(pillId ? `/api/pills/${pillId}` : '/api/pills', {
				method: pillId ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(parsed.data)
			});

			if (res.status === 422) {
				const data = (await res.json()) as { fields?: Record<string, string> };
				errors = data.fields ?? {};
				focusFirstError();
				return;
			}
			if (!res.ok) throw new Error();

			const data = (await res.json()) as { id?: string; needsVerification?: boolean };

			if (data.needsVerification) {
				toast.info('Pillola salvata come privata: conferma prima la tua email per pubblicarla.');
			} else {
				toast.success(pillId ? 'Pillola aggiornata' : 'Pillola salvata');
			}

			await goto(`/pillole/${data.id ?? pillId}`, { replaceState: true, invalidateAll: true });
		} catch {
			toast.error('Salvataggio non riuscito. Il testo è ancora qui: riprova.');
		} finally {
			submitting = false;
		}
	}

	function focusFirstError() {
		const first = Object.keys(errors)[0];
		if (!first) return;
		const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
		el?.focus();
		el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	const SNIPPETS = [
		{ label: 'Frazione', code: '$\\frac{...}{b}$' },
		{ label: 'Potenza', code: '$x^{...}$' },
		{ label: 'Radice', code: '$\\sqrt{...}$' },
		{ label: 'Somma', code: '$\\sum_{i=1}^{n} ...$' },
		{ label: 'Integrale', code: '$\\int_{a}^{b} ... \\,dx$' },
		{ label: 'Blocco', code: '$$\n...\n$$' }
	];
</script>

<svelte:window
	onbeforeunload={(e) => {
		// Protegge dal chiudere per sbaglio la scheda con del testo non salvato.
		if (dirty && !submitting) {
			e.preventDefault();
			return '';
		}
	}}
/>

<form onsubmit={submit} novalidate class="space-y-6">
	<!-- Riepilogo errori in cima: chi usa uno screen reader lo sente subito,
	     e ogni voce porta al campo giusto. -->
	{#if Object.keys(errors).length > 0}
		<div
			class="card p-4"
			style="background:var(--c-danger-soft);border-color:var(--c-danger)"
			role="alert"
			tabindex="-1"
		>
			<p class="flex items-center gap-2 font-bold" style="color:var(--c-danger)">
				<Icon name="alert" size={19} />
				Controlla {Object.keys(errors).length === 1 ? 'questo campo' : 'questi campi'}
			</p>
			<ul class="mt-2 list-inside list-disc text-sm">
				{#each Object.entries(errors) as [field, message] (field)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Titolo -->
	<FormField
		id="titolo"
		label="Titolo"
		error={errors.title}
		hint="{title.length}/140 — una frase che si capisce senza contesto."
	>
		{#snippet children(a)}
			<input
				id="titolo"
				data-field="title"
				class="input"
				bind:value={title}
				maxlength="140"
				placeholder="Perché il microonde scalda il cibo"
				autocomplete="off"
				{...a}
			/>
		{/snippet}
	</FormField>

	<!-- Categoria -->
	<fieldset data-field="categoryId" tabindex="-1">
		<legend class="label">Categoria</legend>
		<div class="flex flex-wrap gap-2">
			{#each CATEGORIES as cat (cat.id)}
				{@const active = categoryId === cat.id}
				<label
					class="chip min-h-11 cursor-pointer transition-transform active:scale-95"
					style={active
						? `background:${cat.color};color:${cat.onColor};border-color:transparent`
						: ''}
				>
					<input
						type="radio"
						name="categoria"
						value={cat.id}
						bind:group={categoryId}
						class="sr-only"
					/>
					<Icon name={cat.icon as never} size={15} strokeWidth={2.5} />
					{cat.label}
					{#if active}<Icon name="check" size={15} strokeWidth={3} />{/if}
				</label>
			{/each}
		</div>
		{#if errors.categoryId}
			<p class="mt-1.5 text-sm font-bold" style="color:var(--c-danger)">{errors.categoryId}</p>
		{/if}
	</fieldset>

	<!-- Corpo + anteprima -->
	<div>
		<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
			<label class="label !mb-0" for="corpo">La pillola</label>
			<div class="flex gap-1 rounded-lg p-0.5" style="background:var(--c-surface-2)">
				<button
					type="button"
					onclick={() => (showPreview = false)}
					aria-pressed={!showPreview}
					class="min-h-9 cursor-pointer rounded-md px-3 text-sm font-bold"
					style={!showPreview
						? 'background:var(--c-bg);color:var(--c-fg)'
						: 'color:var(--c-fg-muted)'}
				>
					Scrivi
				</button>
				<button
					type="button"
					onclick={() => (showPreview = true)}
					aria-pressed={showPreview}
					class="min-h-9 cursor-pointer rounded-md px-3 text-sm font-bold"
					style={showPreview
						? 'background:var(--c-bg);color:var(--c-fg)'
						: 'color:var(--c-fg-muted)'}
				>
					Anteprima
				</button>
			</div>
		</div>

		<div class="mb-2 flex flex-wrap items-center gap-2">
			<label class="chip min-h-11 cursor-pointer">
				<input
					type="checkbox"
					checked={format === 'latex'}
					onchange={(e) => (format = e.currentTarget.checked ? 'latex' : 'text')}
					class="h-4 w-4 accent-[var(--c-primary)]"
				/>
				Uso le formule (LaTeX)
			</label>
		</div>

		{#if format === 'latex' && !showPreview}
			<!-- Scorciatoie: chi non conosce LaTeX non deve impararlo per scrivere una frazione. -->
			<div class="-mx-4 mb-2 overflow-x-auto px-4">
				<div class="flex w-max gap-1.5" role="group" aria-label="Inserisci una formula">
					{#each SNIPPETS as s (s.label)}
						<button
							type="button"
							class="chip min-h-9 cursor-pointer"
							onclick={() => insertSnippet(s.code)}
						>
							{s.label}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if showPreview}
			<div class="card min-h-64 p-4">
				{#if body.trim()}
					<PillBody {body} {format} />
				{:else}
					<p class="text-sm" style="color:var(--c-fg-muted)">
						L’anteprima comparirà qui appena scrivi qualcosa.
					</p>
				{/if}
			</div>
		{:else}
			<textarea
				id="corpo"
				data-field="body"
				bind:this={bodyEl}
				bind:value={body}
				rows="12"
				class="input resize-y font-normal"
				style="min-height:16rem;line-height:1.7"
				placeholder={format === 'latex'
					? 'Le microonde eccitano le molecole d’acqua a $2{,}45\\ \\text{GHz}$…'
					: 'Le microonde fanno oscillare le molecole d’acqua nel cibo. L’attrito fra le molecole produce calore, ed è per questo che…'}
				aria-invalid={errors.body ? 'true' : undefined}
				aria-describedby={errors.body ? 'err-corpo' : 'hint-corpo'}></textarea>
			{#if errors.body}
				<p id="err-corpo" class="mt-1.5 text-sm font-bold" style="color:var(--c-danger)">
					{errors.body}
				</p>
			{:else}
				<p id="hint-corpo" class="mt-1.5 text-sm" style="color:var(--c-fg-muted)">
					{#if format === 'latex'}
						<code>$formula$</code> nel testo, <code>$$formula$$</code> per una riga a sé.
					{:else}
						Supporta <code>**grassetto**</code>, <code>*corsivo*</code> e
						<code>[link](https://…)</code>.
					{/if}
				</p>
			{/if}
		{/if}
	</div>

	<!-- Fonti -->
	<fieldset>
		<legend class="label"
			>Fonti <span class="font-normal" style="color:var(--c-fg-muted)">(facoltative)</span></legend
		>

		{#if sources.length === 0}
			<p class="mb-2 text-sm" style="color:var(--c-fg-muted)">
				Da dove viene questa informazione? Citarlo la rende molto più utile agli altri.
			</p>
		{/if}

		<div class="space-y-2">
			{#each sources as source, i (i)}
				<div class="card flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
					<div class="min-w-0 flex-1">
						<label class="sr-only" for="fonte-{i}">Nome della fonte {i + 1}</label>
						<input
							id="fonte-{i}"
							class="input"
							bind:value={source.label}
							placeholder="Titolo o autore"
							maxlength="120"
						/>
					</div>
					<div class="min-w-0 flex-1">
						<label class="sr-only" for="fonte-url-{i}">Link della fonte {i + 1}</label>
						<input
							id="fonte-url-{i}"
							class="input"
							bind:value={source.url}
							type="url"
							inputmode="url"
							placeholder="https://…"
							aria-invalid={errors[`sources.${i}.url`] ? 'true' : undefined}
						/>
						{#if errors[`sources.${i}.url`]}
							<p class="mt-1 text-sm font-bold" style="color:var(--c-danger)">
								{errors[`sources.${i}.url`]}
							</p>
						{/if}
					</div>
					<button
						type="button"
						class="btn btn-ghost shrink-0 !px-3"
						onclick={() => removeSource(i)}
						aria-label="Rimuovi la fonte {i + 1}"
					>
						<Icon name="trash" size={18} />
					</button>
				</div>
			{/each}
		</div>

		{#if sources.length < 10}
			<button type="button" class="btn btn-ghost mt-2 text-sm" onclick={addSource}>
				<Icon name="plus" size={18} />
				Aggiungi una fonte
			</button>
		{/if}
	</fieldset>

	<!-- Visibilità -->
	<div class="card p-4">
		<label class="flex cursor-pointer items-start gap-3">
			<input
				type="checkbox"
				bind:checked={isPublic}
				disabled={!canPublish}
				class="mt-0.5 h-5 w-5 shrink-0 accent-[var(--c-primary)]"
			/>
			<span class="min-w-0">
				<span class="flex items-center gap-2 font-extrabold">
					<Icon name={isPublic ? 'globe' : 'lock'} size={18} />
					{isPublic ? 'Pubblica nel feed' : 'Resta privata'}
				</span>
				<span class="mt-1 block text-sm" style="color:var(--c-fg-muted)">
					{#if !canPublish}
						Per pubblicare serve uno username.
						<a href="/profilo/modifica" class="font-bold underline">Sistemalo qui</a>.
					{:else if isPublic}
						Tutti potranno leggerla e salvarla nella loro libreria, con il tuo nome.
					{:else}
						Solo tu puoi vederla. Puoi pubblicarla quando vuoi.
					{/if}
				</span>
			</span>
		</label>
	</div>

	<div
		class="safe-bottom sticky bottom-16 z-30 flex gap-3 border-t pt-3 sm:bottom-0"
		style="background:var(--c-bg);border-color:var(--c-border)"
	>
		<button type="submit" class="btn btn-primary flex-1" disabled={submitting}>
			{#if submitting}
				<Icon name="loader" size={19} class="animate-spin" />
				Salvo…
			{:else}
				<Icon name="check" size={19} strokeWidth={2.5} />
				{pillId ? 'Salva le modifiche' : 'Salva la pillola'}
			{/if}
		</button>
	</div>
</form>

<style>
	:global(.animate-spin) {
		animation: spin 900ms linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
