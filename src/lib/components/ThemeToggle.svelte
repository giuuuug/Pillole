<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from './Icon.svelte';

	let theme = $state<'light' | 'dark'>(
		browser && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
	);

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('pillole:theme', theme);
		} catch {
			// Storage negato (Safari privato): il tema resta valido per questa sessione.
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	class="btn btn-ghost !min-w-11 !px-2.5"
	aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
>
	<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
</button>
