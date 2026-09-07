<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/client/toast.svelte';
	import { relativeTime } from '$lib/utils/format';
	import type { PillCard as PillCardData } from '$lib/server/services/pill-service';
	import Avatar from './Avatar.svelte';
	import Badge from './Badge.svelte';
	import CategoryChip from './CategoryChip.svelte';
	import Icon from './Icon.svelte';

	type Props = {
		pill: PillCardData;
		/** Nel feed mostriamo l'autore; nella libreria solo se non e' nostra. */
		showAuthor?: boolean;
		canInteract?: boolean;
	};

	let { pill = $bindable(), showAuthor = true, canInteract = true }: Props = $props();

	let saving = $state(false);

	async function toggleSave(event: MouseEvent) {
		// La card e' un link: il click sul bottone non deve navigare.
		event.preventDefault();
		event.stopPropagation();

		if (!canInteract) {
			toast.info('Accedi per salvare le pillole nella tua libreria.');
			return;
		}

		const wasSaved = pill.isSaved;
		// Aggiornamento ottimistico: l'interfaccia risponde subito, poi
		// riallinea (o torna indietro) quando arriva la risposta.
		pill.isSaved = !wasSaved;
		pill.saveCount += wasSaved ? -1 : 1;
		saving = true;

		try {
			const res = await fetch(`/api/pills/${pill.id}/save`, {
				method: wasSaved ? 'DELETE' : 'POST'
			});
			if (!res.ok) throw new Error();
			const data = (await res.json()) as { saveCount: number };
			pill.saveCount = data.saveCount;
			toast.success(wasSaved ? 'Rimossa dalla libreria' : 'Salvata nella tua libreria');
			await invalidateAll();
		} catch {
			pill.isSaved = wasSaved;
			pill.saveCount += wasSaved ? 1 : -1;
			toast.error('Non è stato possibile salvare la pillola. Riprova.');
		} finally {
			saving = false;
		}
	}

	const timestamp = $derived(pill.publishedAt ?? pill.createdAt);
</script>

<article class="card group relative transition-shadow duration-200 hover:shadow-md">
	<div class="p-4 sm:p-5">
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<CategoryChip id={pill.categoryId} />
			{#if pill.isMine}
				<span
					class="chip text-xs"
					style={pill.isPublic
						? 'background:var(--c-accent-soft);color:var(--c-accent)'
						: 'background:var(--c-surface-2);color:var(--c-fg-muted)'}
				>
					<Icon name={pill.isPublic ? 'globe' : 'lock'} size={13} strokeWidth={2.5} />
					{pill.isPublic ? 'Pubblica' : 'Privata'}
				</span>
			{/if}
			{#if pill.format === 'latex'}
				<span class="chip text-xs" title="Contiene formule">
					<Icon name="function" size={13} strokeWidth={2.5} />
					Formule
				</span>
			{/if}
		</div>

		<h3 class="text-lg font-extrabold sm:text-xl">
			<!-- Link "stretched": tutta la card e' cliccabile, ma nel DOM
			     resta un solo link — gli screen reader non leggono duplicati. -->
			<a href="/pillole/{pill.id}" class="after:absolute after:inset-0 after:content-['']">
				{pill.title}
			</a>
		</h3>

		<p class="mt-1.5 line-clamp-3 text-sm" style="color:var(--c-fg-muted)">
			{pill.excerpt}
		</p>

		<div class="mt-4 flex items-center justify-between gap-3">
			{#if showAuthor}
				<a
					href="/u/{pill.author.username}"
					class="relative z-10 -m-1 flex min-w-0 items-center gap-2 rounded-lg p-1 hover:underline"
				>
					<Avatar
						name={pill.author.name}
						username={pill.author.username}
						image={pill.author.image}
						size={28}
					/>
					<span class="flex min-w-0 items-center gap-1">
						<span class="block truncate text-sm font-bold">@{pill.author.username}</span>
						<Badge id={pill.author.badge} size={14} />
					</span>
				</a>
			{:else}
				<span class="text-xs" style="color:var(--c-fg-muted)">
					<time datetime={timestamp}>{relativeTime(timestamp)}</time>
				</span>
			{/if}

			<div class="relative z-10 flex shrink-0 items-center gap-1">
				{#if showAuthor}
					<span class="text-xs" style="color:var(--c-fg-muted)">
						<time datetime={timestamp}>{relativeTime(timestamp)}</time>
					</span>
				{/if}

				{#if !pill.isMine && pill.isPublic}
					<button
						type="button"
						onclick={toggleSave}
						disabled={saving}
						aria-pressed={pill.isSaved}
						class="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-sm font-bold transition-colors"
						style="color:{pill.isSaved ? 'var(--c-primary-text)' : 'var(--c-fg-muted)'}"
					>
						<Icon
							name="bookmark"
							size={19}
							filled={pill.isSaved}
							label={pill.isSaved ? 'Rimuovi dalla libreria' : 'Salva nella libreria'}
						/>
						{#if pill.saveCount > 0}<span aria-hidden="true">{pill.saveCount}</span>{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
</article>

<style>
	article:hover {
		border-color: var(--c-border-strong);
	}
	/* Il focus da tastiera sul link interno evidenzia l'intera card. */
	article:has(a:focus-visible) {
		outline: 3px solid var(--c-ring);
		outline-offset: 2px;
	}
	article:has(a:focus-visible) a:focus-visible {
		outline: none;
	}
</style>
