<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from '$lib/client/toast.svelte';
	import { fullDate, relativeTime } from '$lib/utils/format';
	import { toPlainText } from '$lib/utils/render';
	import Avatar from '$lib/components/Avatar.svelte';
	import CategoryChip from '$lib/components/CategoryChip.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PillBody from '$lib/components/PillBody.svelte';

	let { data } = $props();

	// $derived scrivibile: parte da `data.pill` e si riallinea da solo quando
	// cambia (navigazione a un'altra pillola), ma resta modificabile in
	// locale per gli aggiornamenti ottimistici (salva, preferita, ecc.).
	let pill = $derived(data.pill);

	let busy = $state(false);
	let confirmingDelete = $state(false);
	let deleteDialog: HTMLDialogElement | undefined;

	// <dialog>.showModal() da' gratis quello che il div manuale non aveva
	// (audit §7 #2): focus intrappolato dentro, Esc che chiude, sfondo non
	// interattivo. Lo scroll dello sfondo lo blocchiamo a mano: showModal()
	// da solo non lo garantisce in tutti i browser.
	$effect(() => {
		if (confirmingDelete) {
			deleteDialog?.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			deleteDialog?.close();
			document.body.style.overflow = '';
		}
	});

	async function toggleSave() {
		if (!data.user) {
			toast.info('Accedi per salvare questa pillola nella tua libreria.');
			return;
		}

		const was = pill.isSaved;
		pill.isSaved = !was;
		pill.saveCount += was ? -1 : 1;
		busy = true;

		try {
			const res = await fetch(`/api/pills/${pill.id}/save`, { method: was ? 'DELETE' : 'POST' });
			if (!res.ok) throw new Error();
			pill.saveCount = ((await res.json()) as { saveCount: number }).saveCount;
			toast.success(was ? 'Rimossa dalla libreria' : 'Salvata nella tua libreria');
			await invalidateAll();
		} catch {
			pill.isSaved = was;
			pill.saveCount += was ? 1 : -1;
			toast.error('Operazione non riuscita. Riprova.');
		} finally {
			busy = false;
		}
	}

	async function toggleFavorite() {
		const was = pill.isFavorite;
		pill.isFavorite = !was;
		busy = true;

		try {
			const res = await fetch(`/api/pills/${pill.id}/favorite`, { method: 'POST' });
			if (!res.ok) throw new Error();
			pill.isFavorite = ((await res.json()) as { isFavorite: boolean }).isFavorite;
			await invalidateAll();
		} catch {
			pill.isFavorite = was;
			toast.error('Operazione non riuscita. Riprova.');
		} finally {
			busy = false;
		}
	}

	async function remove() {
		busy = true;
		try {
			const res = await fetch(`/api/pills/${pill.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error();
			toast.success('Pillola eliminata');
			await goto('/libreria', { invalidateAll: true });
		} catch {
			toast.error('Eliminazione non riuscita.');
			busy = false;
		}
	}

	async function share() {
		const url = `${location.origin}/pillole/${pill.id}`;
		try {
			if (navigator.share) {
				await navigator.share({ title: pill.title, url });
			} else {
				await navigator.clipboard.writeText(url);
				toast.success('Link copiato');
			}
		} catch {
			// L'utente ha annullato la condivisione: non e' un errore da segnalare.
		}
	}

	const timestamp = $derived(pill.publishedAt ?? pill.createdAt);
	const description = $derived(toPlainText(pill.body, 160));
</script>

<svelte:head>
	<title>{pill.title} — Pillole</title>
	<meta name="description" content={description} />
	{#if pill.isPublic}
		<link rel="canonical" href={page.url.origin + page.url.pathname} />
		<meta property="og:url" content={page.url.origin + page.url.pathname} />
		<meta property="og:title" content={pill.title} />
		<meta property="og:description" content={description} />
		<meta property="og:type" content="article" />
		<meta name="twitter:title" content={pill.title} />
		<meta name="twitter:description" content={description} />
	{:else}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<!-- Il "back" del browser resta il percorso principale: questo e' un aiuto, non un sostituto. -->
<button
	type="button"
	class="btn btn-ghost mb-4 text-sm"
	onclick={() => (history.length > 1 ? history.back() : goto('/'))}
>
	<Icon name="chevron-left" size={18} />
	Indietro
</button>

<article>
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<CategoryChip id={pill.categoryId} size="md" />
		{#if pill.isMine}
			<span
				class="chip text-xs"
				style={pill.isPublic
					? 'background:var(--c-accent-soft);color:var(--c-accent)'
					: 'background:var(--c-surface-2);color:var(--c-fg-muted)'}
			>
				<Icon name={pill.isPublic ? 'globe' : 'lock'} size={14} strokeWidth={2.5} />
				{pill.isPublic ? 'Pubblica' : 'Privata'}
			</span>
		{/if}
	</div>

	<h1 class="text-2xl sm:text-4xl">{pill.title}</h1>

	<!-- Attribuzione: sempre visibile, anche quando la pillola e' salvata
	     nella libreria di qualcun altro. -->
	<div
		class="mt-4 flex flex-wrap items-center gap-3 border-b pb-5"
		style="border-color:var(--c-border)"
	>
		<a href="/u/{pill.author.username}" class="flex items-center gap-2.5 hover:underline">
			<Avatar
				name={pill.author.name}
				username={pill.author.username}
				image={pill.author.image}
				size={40}
			/>
			<span>
				<span class="block font-extrabold">@{pill.author.username}</span>
				<span class="block text-sm" style="color:var(--c-fg-muted)">{pill.author.name}</span>
			</span>
		</a>
		<span class="text-sm" style="color:var(--c-fg-muted)">
			· <time datetime={timestamp} title={fullDate(timestamp)}>{relativeTime(timestamp)}</time>
		</span>
	</div>

	<div class="py-6">
		<PillBody body={pill.body} format={pill.format} />
	</div>

	{#if pill.sources.length > 0}
		<section class="card p-4" aria-labelledby="fonti">
			<h2 id="fonti" class="mb-3 flex items-center gap-2 text-base">
				<Icon name="link" size={18} />
				Fonti
			</h2>
			<ol class="space-y-2 text-sm">
				{#each pill.sources as source, i (i)}
					<li class="flex gap-2">
						<span class="shrink-0 font-bold" style="color:var(--c-fg-muted)">{i + 1}.</span>
						{#if source.url}
							<a
								href={source.url}
								target="_blank"
								rel="noopener noreferrer nofollow"
								class="inline-flex min-h-6 items-baseline gap-1 break-words underline underline-offset-2"
								style="color:var(--c-accent)"
							>
								{source.label}
								<Icon name="external-link" size={14} label="si apre in una nuova scheda" />
							</a>
						{:else}
							<span class="break-words">{source.label}</span>
						{/if}
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</article>

<!-- Azioni: barra fissa sopra la tab bar, sempre raggiungibile col pollice. -->
<div
	class="safe-bottom sticky bottom-16 z-30 mt-6 flex flex-wrap gap-2 border-t pt-3 sm:bottom-0"
	style="background:var(--c-bg);border-color:var(--c-border)"
>
	{#if pill.isMine}
		<a href="/pillole/{pill.id}/modifica" class="btn btn-primary flex-1">
			<Icon name="edit" size={19} />
			Modifica
		</a>
		<button type="button" class="btn btn-ghost" onclick={share} aria-label="Condividi la pillola">
			<Icon name="link" size={19} />
		</button>
		<button
			type="button"
			class="btn btn-ghost"
			onclick={toggleFavorite}
			disabled={busy}
			aria-pressed={pill.isFavorite}
			aria-label={pill.isFavorite ? 'Rimuovi dai preferiti' : 'Segna come preferita'}
			style={pill.isFavorite ? 'color:var(--c-danger)' : undefined}
		>
			<Icon name="heart" size={19} strokeWidth={2.5} filled={pill.isFavorite} />
		</button>
		<button
			type="button"
			class="btn btn-ghost"
			onclick={() => (confirmingDelete = true)}
			aria-label="Elimina la pillola"
			style="color:var(--c-danger)"
		>
			<Icon name="trash" size={19} />
		</button>
	{:else}
		<button
			type="button"
			class="btn flex-1"
			class:btn-primary={!pill.isSaved}
			class:btn-ghost={pill.isSaved}
			onclick={toggleSave}
			disabled={busy}
			aria-pressed={pill.isSaved}
		>
			<Icon name={pill.isSaved ? 'check' : 'bookmark'} size={19} strokeWidth={2.5} />
			{pill.isSaved ? 'Nella tua libreria' : 'Salva in libreria'}
		</button>
		<button type="button" class="btn btn-ghost" onclick={share} aria-label="Condividi la pillola">
			<Icon name="link" size={19} />
		</button>
	{/if}
</div>

<!-- Conferma esplicita: eliminare e' irreversibile, e il pulsante distruttivo
     non e' quello su cui cade il pollice per primo. Un <dialog> nativo aperto
     con showModal() intrappola il focus e chiude con Esc da solo. -->
<dialog
	bind:this={deleteDialog}
	class="dialog-reset w-full max-w-sm rounded-2xl p-0"
	aria-labelledby="conferma-titolo"
	onclose={() => (confirmingDelete = false)}
>
	<div class="card w-full p-5">
		<h2 id="conferma-titolo" class="text-xl">Eliminare questa pillola?</h2>
		<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">
			Sparisce anche dalle librerie di chi l’aveva salvata. Non si può annullare.
		</p>
		<div class="mt-5 flex gap-2">
			<!-- svelte-ignore a11y_autofocus -->
			<button
				type="button"
				class="btn btn-ghost flex-1"
				onclick={() => (confirmingDelete = false)}
				autofocus
			>
				Annulla
			</button>
			<button type="button" class="btn btn-danger flex-1" onclick={remove} disabled={busy}>
				Elimina
			</button>
		</div>
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
