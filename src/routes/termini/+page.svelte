<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	const aggiornata = '4 settembre 2026';
</script>

<svelte:head>
	<title>Termini di servizio — Pillole</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-4 py-8">
	<a
		href="/"
		class="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold underline underline-offset-2"
	>
		<Icon name="chevron-left" size={18} />
		Torna a Pillole
	</a>

	<div class="card space-y-8 p-6 sm:p-8">
		<header>
			<h1 class="text-3xl font-extrabold" style="font-family:var(--font-display)">
				Termini di servizio
			</h1>
			<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">Ultimo aggiornamento: {aggiornata}</p>
		</header>

		<section class="space-y-3">
			<p>
				Questi termini regolano l'uso di <strong>Pillole</strong>, un servizio gratuito gestito da
				Matteo Giuliani. Creando un account accetti quanto segue. Se qualcosa non ti è chiaro,
				scrivi a
				<a href="mailto:mttgiuliani1@gmail.com" class="font-bold underline underline-offset-2"
					>mttgiuliani1@gmail.com</a
				>
				prima di iscriverti.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">1. Cos'è Pillole</h2>
			<p>
				Pillole è un archivio personale di conoscenza: scrivi "pillole" — spiegazioni brevi di un
				concetto — e le organizzi per categoria. Ogni pillola è privata finché non scegli
				esplicitamente di renderla pubblica; solo allora entra nel feed condiviso con gli altri
				utenti.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">2. Chi può iscriversi</h2>
			<ul class="list-disc space-y-1 pl-5">
				<li>Devi avere almeno 14 anni.</li>
				<li>I dati che fornisci in fase di registrazione devono essere veritieri.</li>
				<li>Sei responsabile di mantenere riservata la tua password.</li>
				<li>Un account è personale e non trasferibile.</li>
			</ul>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">3. I tuoi contenuti</h2>
			<ul class="list-disc space-y-1 pl-5">
				<li>
					Le pillole che scrivi restano tue: pubblicandole su Pillole non cedi la proprietà, concedi
					solo a noi il diritto tecnico di mostrarle secondo le impostazioni di visibilità che
					scegli (privata o pubblica).
				</li>
				<li>Sei l'unico responsabile di ciò che scrivi.</li>
				<li>
					Non pubblicare contenuti illegali, che violano diritti d'autore altrui, che incitano
					all'odio o alla violenza, o che sono ingannevoli in modo dannoso.
				</li>
				<li>
					Quando un'altra persona salva una tua pillola pubblica, ne resta l'attribuzione a te: se
					la modifichi, la modifica si riflette anche a chi l'ha salvata.
				</li>
				<li>
					Ci riserviamo il diritto di rimuovere contenuti che violano questi termini, e di
					sospendere o eliminare account che li violano ripetutamente.
				</li>
			</ul>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">4. Comportamento</h2>
			<p>Usando Pillole ti impegni a non:</p>
			<ul class="list-disc space-y-1 pl-5">
				<li>usare il servizio per inviare spam o molestare altri utenti;</li>
				<li>tentare di accedere ad account altrui o aggirare le misure di sicurezza;</li>
				<li>
					automatizzare l'uso del servizio (bot, scraping massivo) in modo da comprometterne il
					funzionamento per gli altri.
				</li>
			</ul>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">5. Gratuità e disponibilità del servizio</h2>
			<p>
				Pillole è gratuito e senza pubblicità. È un progetto indipendente, gestito con risorse
				limitate: non garantiamo una disponibilità continua (uptime) né tempi di risposta al
				supporto. Ci riserviamo il diritto di modificare, sospendere o chiudere il servizio in
				qualsiasi momento; in caso di chiusura definitiva, ti avviseremo con ragionevole anticipo
				quando possibile, così da poterti scaricare i tuoi contenuti.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">6. Cancellazione dell'account</h2>
			<p>
				Puoi eliminare il tuo account in qualsiasi momento dalle impostazioni del profilo. La
				cancellazione rimuove il tuo account e le tue pillole in modo permanente: non è reversibile.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">7. Limitazione di responsabilità</h2>
			<p>
				Pillole è fornito "così com'è", senza garanzie di alcun tipo. Nei limiti consentiti dalla
				legge, non siamo responsabili di danni indiretti derivanti dall'uso del servizio o dalla
				perdita di contenuti. Ti consigliamo di conservare altrove una copia di ciò che ritieni
				importante.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">8. Modifiche a questi termini</h2>
			<p>
				Possiamo aggiornare questi termini nel tempo. Le modifiche sostanziali verranno segnalate
				con un aggiornamento della data in cima a questa pagina. L'uso continuato del servizio dopo
				una modifica implica l'accettazione dei nuovi termini.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">9. Legge applicabile</h2>
			<p>
				Questi termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
				il foro del luogo di residenza dell'utente, quando qualificabile come consumatore ai sensi
				del Codice del Consumo.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">10. Contatti</h2>
			<p>
				Per domande su questi termini scrivi a
				<a href="mailto:mttgiuliani1@gmail.com" class="font-bold underline underline-offset-2"
					>mttgiuliani1@gmail.com</a
				>.
			</p>
		</section>
	</div>
</div>
