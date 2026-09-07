<script lang="ts">
	import '../app.css';
	import Toaster from '$lib/components/Toaster.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Pillole — il tuo bagaglio di conoscenza</title>
</svelte:head>

<!-- Primo elemento focusabile della pagina: chi naviga da tastiera salta la nav. -->
<a
	href="#contenuto"
	class="sr-only rounded-lg px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-200"
	style="background:var(--c-primary);color:var(--c-on-primary)"
>
	Vai al contenuto
</a>

{@render children()}

<Toaster />
