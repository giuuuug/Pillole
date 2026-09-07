<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	type Props = {
		icon?: IconName;
		title: string;
		description: string;
		children?: Snippet;
	};
	let { icon = 'pill', title, description, children }: Props = $props();
</script>

<!-- Uno stato vuoto dice sempre COSA fare adesso, non solo che non c'e' niente. -->
<div class="flex flex-col items-center px-6 py-14 text-center">
	<span
		class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
		style="background:var(--c-primary-soft);color:var(--c-primary-text)"
	>
		<Icon name={icon} size={30} strokeWidth={2} />
	</span>
	<h2 class="text-xl font-extrabold">{title}</h2>
	<p class="mt-2 max-w-sm text-sm" style="color:var(--c-fg-muted)">{description}</p>
	{#if children}
		<div class="mt-6 flex flex-wrap justify-center gap-3">{@render children()}</div>
	{/if}
</div>
