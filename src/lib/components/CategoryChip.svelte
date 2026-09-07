<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	import { getCategory } from '$lib/domain/categories';

	type Props = { id: string; size?: 'sm' | 'md'; showLabel?: boolean };
	let { id, size = 'sm', showLabel = true }: Props = $props();

	const cat = $derived(getCategory(id));
</script>

{#if cat}
	<span
		class="chip"
		class:text-xs={size === 'sm'}
		style="background:{cat.color};color:{cat.onColor};border-color:transparent"
	>
		<!-- L'icona e' ridondante: la categoria e' comunque scritta accanto,
		     quindi il colore non e' mai l'unico veicolo di significato. -->
		<Icon name={cat.icon as IconName} size={size === 'sm' ? 14 : 16} strokeWidth={2.5} />
		{#if showLabel}{cat.label}{/if}
	</span>
{/if}
