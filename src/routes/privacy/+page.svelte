<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	const aggiornata = '4 settembre 2026';
</script>

<svelte:head>
	<title>Informativa sulla privacy — Pillole</title>
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
				Informativa sulla privacy
			</h1>
			<p class="mt-2 text-sm" style="color:var(--c-fg-muted)">Ultimo aggiornamento: {aggiornata}</p>
		</header>

		<section class="space-y-3">
			<p>
				Questa informativa spiega quali dati raccoglie <strong>Pillole</strong> quando usi l'app, perché,
				e quali diritti hai su di essi. È scritta ai sensi degli articoli 13 e 14 del Regolamento (UE)
				2016/679 (GDPR).
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">1. Chi tratta i tuoi dati</h2>
			<p>
				Il titolare del trattamento è <strong>Matteo Giuliani</strong>, sviluppatore e gestore di
				Pillole, contattabile all'indirizzo
				<a href="mailto:mttgiuliani1@gmail.com" class="font-bold underline underline-offset-2"
					>mttgiuliani1@gmail.com</a
				>. Pillole è un progetto indipendente, senza pubblicità né vendita di dati a terzi.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">2. Quali dati raccogliamo</h2>
			<div class="space-y-4">
				<div>
					<h3 class="font-bold">Dati che fornisci tu</h3>
					<ul class="mt-1 list-disc space-y-1 pl-5">
						<li>Nome, cognome, indirizzo email, username</li>
						<li>
							Data di nascita — serve solo a verificare il requisito dei 14 anni minimi, non è
							mostrata a nessuno
						</li>
						<li>Password, salvata in forma cifrata (non è mai leggibile, nemmeno da noi)</li>
						<li>Biografia del profilo, se la scrivi (facoltativa)</li>
						<li>Le pillole che scrivi: titolo, testo, categoria, fonti citate</li>
						<li>
							Se accedi con Google o Apple: nome, email e immagine del profilo forniti da quel
							servizio (funzione non ancora attiva)
						</li>
					</ul>
				</div>
				<div>
					<h3 class="font-bold">Dati raccolti automaticamente</h3>
					<ul class="mt-1 list-disc space-y-1 pl-5">
						<li>
							Indirizzo IP e user agent del browser al momento del login, per riconoscere la tua
							sessione e proteggere l'account da accessi abusivi
						</li>
						<li>Data di creazione dell'account e delle pillole, per ordinarle cronologicamente</li>
					</ul>
				</div>
			</div>
			<p>
				Non usiamo cookie di profilazione né strumenti di analisi/tracciamento di terze parti.
				L'unico cookie impostato serve a mantenere la sessione di accesso (cookie tecnico,
				necessario al funzionamento del servizio, non richiede consenso ai sensi dell'art. 122 del
				Codice Privacy).
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">3. Perché trattiamo questi dati</h2>
			<ul class="list-disc space-y-1 pl-5">
				<li>
					<strong>Per fornirti il servizio</strong> — creare e gestire il tuo account, salvare le tue
					pillole, mostrarle a te o, se scegli di pubblicarle, agli altri utenti (base giuridica: esecuzione
					di un contratto, art. 6.1.b GDPR)
				</li>
				<li>
					<strong>Per la sicurezza</strong> — prevenire accessi non autorizzati, limitare i tentativi
					di login e le richieste abusive (base giuridica: legittimo interesse, art. 6.1.f GDPR)
				</li>
				<li>
					<strong>Per comunicazioni di servizio</strong> — email di verifica dell'account o di recupero
					password (base giuridica: esecuzione di un contratto)
				</li>
			</ul>
			<p>Non inviamo email di marketing e non usiamo i tuoi dati per pubblicità.</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">4. Con chi condividiamo i dati</h2>
			<p>
				Non vendiamo né cediamo i tuoi dati. Per far funzionare Pillole ci appoggiamo a fornitori
				tecnici che trattano i dati per nostro conto, in qualità di responsabili del trattamento:
			</p>
			<ul class="list-disc space-y-1 pl-5">
				<li>
					<strong>Netlify, Inc.</strong> (Stati Uniti) — ospita il sito e le funzioni serverless
				</li>
				<li>
					<strong>Neon / Netlify DB</strong> — ospita il database dove sono salvati i tuoi dati
				</li>
				<li>
					<strong>Resend</strong> (Stati Uniti) — invia le email di verifica account e recupero
					password. <em>Non ancora attivo</em>: finché non è configurato, queste email non vengono
					inviate
				</li>
				<li>
					<strong>Google LLC</strong> e <strong>Apple Inc.</strong> — solo se scegli di accedere
					tramite quei servizi. <em>Non ancora attivi</em>
				</li>
			</ul>
			<p>
				Alcuni di questi fornitori hanno sede negli Stati Uniti: il trasferimento dei dati verso
				quel Paese avviene sulla base delle Clausole Contrattuali Standard approvate dalla
				Commissione Europea, che quei fornitori adottano nei propri contratti.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">5. Quanto conserviamo i dati</h2>
			<p>
				Conserviamo i tuoi dati finché il tuo account resta attivo. Se elimini l'account, i tuoi
				dati personali e le tue pillole vengono cancellati dal database; alcune copie di sicurezza
				tecniche possono sopravvivere per un breve periodo prima di essere sovrascritte.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">6. I tuoi diritti</h2>
			<p>Puoi in qualsiasi momento chiedere di:</p>
			<ul class="list-disc space-y-1 pl-5">
				<li>accedere ai dati che abbiamo su di te;</li>
				<li>correggerli, se sono sbagliati o incompleti;</li>
				<li>cancellarli (puoi anche eliminare l'account direttamente dalle impostazioni);</li>
				<li>limitarne o opporti al trattamento;</li>
				<li>riceverli in un formato portabile.</li>
			</ul>
			<p>
				Per esercitare questi diritti scrivi a
				<a href="mailto:mttgiuliani1@gmail.com" class="font-bold underline underline-offset-2"
					>mttgiuliani1@gmail.com</a
				>. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (<a
					href="https://www.garanteprivacy.it"
					target="_blank"
					rel="noopener noreferrer"
					class="font-bold underline underline-offset-2">www.garanteprivacy.it</a
				>).
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">7. Età minima</h2>
			<p>
				Pillole richiede almeno 14 anni per iscriversi. Se sei un genitore e ritieni che tuo figlio
				minorenne abbia creato un account senza il tuo consenso, scrivici e lo rimuoveremo.
			</p>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-bold">8. Modifiche a questa informativa</h2>
			<p>
				Se cambiamo in modo sostanziale come trattiamo i tuoi dati, aggiorneremo questa pagina e la
				data in cima. Ti consigliamo di ricontrollarla di tanto in tanto.
			</p>
		</section>
	</div>
</div>
