<script lang="ts">
	let { count = 3 }: { count?: number } = $props();
</script>

<!--
  Lo scheletro ha la stessa altezza della card vera: quando arrivano i dati
  nulla si sposta (CLS ~ 0). aria-hidden perche' e' puro rumore per chi
  usa uno screen reader; l'annuncio del caricamento lo fa la live region.
-->
<div aria-hidden="true" class="space-y-3">
	{#each Array(count) as _unused, i (i)}
		<div class="card p-4 sm:p-5">
			<div class="skeleton h-6 w-28 rounded-full"></div>
			<div class="skeleton mt-3 h-6 w-3/4"></div>
			<div class="skeleton mt-2.5 h-4 w-full"></div>
			<div class="skeleton mt-1.5 h-4 w-5/6"></div>
			<div class="mt-4 flex items-center gap-2">
				<div class="skeleton h-7 w-7 rounded-full"></div>
				<div class="skeleton h-4 w-24"></div>
			</div>
		</div>
	{/each}
</div>
