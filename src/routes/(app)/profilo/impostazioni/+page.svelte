<script lang="ts">
	import { browser } from '$app/environment';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	type ThemePref = 'light' | 'dark' | 'system';

	function currentPref(): ThemePref {
		if (!browser) return 'system';
		try {
			const stored = localStorage.getItem('pillole:theme');
			if (stored === 'light' || stored === 'dark') return stored;
		} catch {
			// Storage negato (Safari privato): si ricade sul sistema.
		}
		return 'system';
	}

	let pref = $state<ThemePref>(currentPref());

	function apply(next: ThemePref) {
		pref = next;
		try {
			if (next === 'system') {
				localStorage.removeItem('pillole:theme');
				document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
			} else {
				localStorage.setItem('pillole:theme', next);
				document.documentElement.dataset.theme = next;
			}
		} catch {
			// Storage negato (Safari privato): il tema resta valido solo per questa sessione.
		}
	}

	const OPTIONS: { id: ThemePref; label: string; icon: IconName }[] = [
		{ id: 'light', label: 'Chiaro', icon: 'sun' },
		{ id: 'dark', label: 'Scuro', icon: 'moon' },
		{ id: 'system', label: 'Automatico', icon: 'sparkles' }
	];
</script>

<svelte:head>
	<title>Impostazioni — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/profilo" class="btn btn-ghost mb-4 text-sm">
	<Icon name="chevron-left" size={18} />
	Profilo
</a>

<h1 class="mb-6 text-2xl sm:text-3xl">Impostazioni</h1>

<section class="card p-5" aria-labelledby="sez-tema">
	<h2 id="sez-tema" class="mb-1 text-lg">Tema</h2>
	<p class="mb-4 text-sm" style="color:var(--c-fg-muted)">
		"Automatico" segue il tema del tuo telefono o computer.
	</p>

	<div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="sez-tema">
		{#each OPTIONS as opt (opt.id)}
			<button
				type="button"
				role="radio"
				aria-checked={pref === opt.id}
				onclick={() => apply(opt.id)}
				class="btn min-h-11"
				class:btn-primary={pref === opt.id}
				class:btn-ghost={pref !== opt.id}
			>
				<Icon name={opt.icon} size={18} />
				{opt.label}
			</button>
		{/each}
	</div>
</section>
