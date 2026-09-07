<script lang="ts">
	import { BADGES, isBadgeId } from '$lib/domain/badges';

	type Props = { id: string | null | undefined; size?: number };
	let { id, size = 16 }: Props = $props();
</script>

{#if isBadgeId(id)}
	<img
		src={BADGES[id].image}
		alt={BADGES[id].label}
		title={BADGES[id].label}
		width={size}
		height={size}
		class="inline-block shrink-0 align-middle"
	/>
{/if}
