# Reattività, sicurezza navigazione, profilo in 3 sezioni, bugfix ricerca/libreria — Implementation Plan

> **Per chi esegue:** questo piano si esegue **inline in questa sessione** (non
> con subagent separati): molti task toccano file condivisi (layout, Icon.svelte,
> route di profilo) e l'ordine tra i gruppi conta. Segui i gruppi in ordine.
> Ogni task elenca file esatti e la verifica da fare prima di passare al successivo.

**Goal:** Risolvere la mancanza di reattività dopo segui/salva/preferita, un
rischio di sicurezza sullo stack di navigazione (bfcache dopo logout), due bug
verificati (ricerca persone → 0 pillole; possibile redirect al login da
libreria), e ristrutturare la sezione Profilo in 3 pagine con responsabilità
separate (anagrafica / account e sicurezza / tema), nascondendo per ora la
verifica email (non funzionante: manca `RESEND_API_KEY` in produzione).

**Architettura:** Nessuna nuova dipendenza. I fix di reattività si ottengono
uniformando `Cache-Control` sulle pagine che mostrano stato per-viewer e
aggiungendo `invalidateAll()` dopo le mutazioni mancanti. Il bug di ricerca è
un problema di qualificazione delle colonne in una subquery correlata Drizzle
(verificato dal vivo sul database di produzione, sola lettura). Il profilo si
divide in 3 route sotto `/profilo/*` invece di una sola. L'eliminazione
account usa un'infrastruttura Better Auth già pronta (cascata FK già presente
nello schema).

**Tech Stack:** SvelteKit 2 + Svelte 5 + TypeScript, Drizzle ORM + Neon, Better
Auth 1.7.2, Tailwind 4. Vedi CLAUDE.md per le versioni reali installate.

**Spec:** richiesta diretta dell'utente in chat (2026-09-07), punto per punto
per sezione (Tutte le sezioni / Profilo / Cerca / Libreria / Feed). Decisione
esplicita raccolta via AskUserQuestion: nascondere la verifica email **e**
togliere il requisito `emailVerified` da `canPublish` (non solo nascondere la UI).

## Global Constraints

- Budget 0€/mese — nessuna nuova dipendenza, nessun servizio esterno nuovo.
- ~20 utenti/giorno — niente websocket/polling per il feed "live"; basta
  smettere di cachare le pagine personalizzate e invalidare dopo le mutazioni.
- Autorizzazione sempre dentro la query o in un guard dedicato (`guards.ts`),
  mai un `if` sparso — vale anche per il nuovo endpoint di eliminazione account
  (già gestito da Better Auth, verificato: password richiesta per gli account
  con credenziali, cancellazione immediata via cascata FK).
- 404 non 403 sui contenuti privati altrui — non toccato da questo piano.
- Testo utente in italiano, identificatori di codice in inglese, segmenti URL
  italiani (`/profilo/modifica`, `/profilo/sicurezza`, `/profilo/impostazioni`).
- Prima di dire "funziona": `npm run lint && npm run check`, poi
  `npm run test:e2e`, poi verifica manuale con `npm run dev` in un browser
  vero (CLAUDE.md §"Prima di dire «funziona»").

---

## Fatti verificati prima di scrivere codice

Questi non sono ipotesi: sono stati riprodotti dal vivo (query di sola lettura
sul database di produzione, poi ripulite) o letti nel codice sorgente di
`better-auth` in `node_modules`.

1. **Bug ricerca persone / profilo pubblico (pillCount sempre 0 o quasi).**
   Riprodotto dal vivo: `searchUsers()` e `getProfileByUsername()` in
   `src/lib/server/services/social-service.ts` calcolano `pillCount` con una
   subquery correlata:

   ```sql
   (select count(*)::int from pill where author_id = id and is_public = true)
   ```

   Drizzle, quando la query esterna tocca **una sola tabella** (`.from(user)`,
   senza join), rende **tutte** le colonne senza qualificarle con il nome
   tabella — anche dentro un frammento `sql\`\``annidato. Il riferimento`${user.id}`diventa quindi`"id"`non qualificato, e dentro la subquery`"id"`risolve alla colonna **locale**`pill.id`(la tabella`pill`ha una
sua colonna`id`), non all'`user.id`esterno voluto — perché nella
risoluzione dei nomi SQL lo scope locale della subquery vince su quello
esterno. Risultato: la condizione diventa`pill.author_id = pill.id`,
quasi sempre falsa → conteggio quasi sempre 0.
Verificato con `.toSQL()`: quando la query esterna tocca **due** tabelle
(es. `getConnections()`, che fa `.from(follow).innerJoin(user, ...)`),
Drizzle qualifica correttamente tutto (`"pill"."author_id" = "user"."id"`)
— quella funzione **non** ha il bug.
Non è un problema di `follow`/`savedPill`: quelle tabelle non hanno una
colonna `id`propria, quindi un riferimento locale non qualificato non
trova nulla e Postgres risale correttamente allo scope esterno — ecco
perché`followerCount`/`followingCount`/`isFollowedByViewer` sono corretti
   anche senza qualificazione esplicita.

2. **Icona ingranaggio malformata.** Il path SVG di `settings` in
   `src/lib/components/Icon.svelte:41-42` è una ricostruzione a mano (non il
   path reale di Lucide, a differenza di ogni altra icona nel file). Il path
   reale, verificato scaricandolo da
   `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/settings.svg`
   (licenza ISC, stessa licenza già dichiarata in cima al file):

   ```
   M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915
   ```

   più il cerchio interno (cx=12,cy=12,r=3) come path, nello stesso stile
   delle altre icone con cerchio (es. `atom`): `M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z`.

3. **`changeEmail` con la configurazione attuale (`enabled: true` e basta) non
   aggiorna mai l'email subito, nemmeno per un utente non verificato** —
   letto in `node_modules/better-auth/.../update-user.mjs:455` e nel tipo in
   `node_modules/better-auth/node_modules/@better-auth/core/dist/types/init-options.d.mts:853-856`:
   serve esplicitamente `updateEmailWithoutVerification: true` perché Better
   Auth aggiorni l'email subito quando l'email **attuale** non è verificata
   (il nostro caso, per chiunque, dato che la verifica non funziona senza
   `RESEND_API_KEY`). Senza quel flag, ogni cambio email manda sempre un
   link di conferma alla nuova casella — che oggi non arriverebbe mai.

4. **`deleteUser` con la configurazione attuale (`enabled: true`, nessun
   `sendDeleteAccountVerification`) cancella l'utente SUBITO** — commento
   esplicito nel tipo, stesso file, riga 869: _"if this is not set, the user
   will be deleted immediately"_. Per un account con password, il client deve
   passare `password` nella chiamata (`authClient.deleteUser({ password })`);
   la cancellazione arriva fino in fondo alla riga `user` via
   `internalAdapter.deleteUser`, e la cascata FK già presente in
   `schema.ts` (`onDelete: 'cascade'` su session/account/pill/follow/savedPill)
   fa sparire tutto il resto. **Nessuna modifica ad `auth.ts` necessaria per
   questo punto** — è già pronto, va solo collegata la UI.

5. **`/libreria` non ha nessuna differenza strutturale** rispetto alle altre
   pagine protette (`requireUser`/redirect manuale identico a `/profilo`,
   `/nuova`, ecc.) — verificato leggendo `hooks.server.ts` e i vari
   `+page.server.ts`. Il tab "Libreria" nella `TabBar` (`src/lib/components/TabBar.svelte`)
   è però **sempre presente nel DOM**, anche da sloggato, il che lo rende
   preloadabile (hover) mentre non si è autenticati — a differenza di altri
   link che compaiono solo dopo login. Non riprodotto in isolamento in questa
   sessione: il Task 8 lo verifica con un test Playwright reale (login da UI
   - click sul tab) **dopo** aver applicato i fix di invalidazione del
     Gruppo A, perché potrebbero già risolverlo.

---

## Gruppo A — Reattività e cache (cross-cutting)

### Task 1: Cache-Control coerente sulle pagine con stato per-viewer

**Files:**

- Modify: `src/routes/(app)/+page.server.ts` (riga con `setHeaders`, feed)
- Modify: `src/routes/(app)/cerca/+page.server.ts:22`
- Modify: `src/routes/(app)/u/[username]/+page.server.ts:15`
- Modify: `src/routes/(app)/pillole/[id]/+page.server.ts:9-13` (solo il ramo pillola pubblica)

**Perché:** queste 4 pagine mostrano `isSaved`/`isFollowedByViewer`/
`isFavorite`, cioè stato che dipende dal viewer autenticato, ma hanno
`Cache-Control: private, max-age=N` — la cache **del browser locale** (non
condivisa: `private` la esclude solo dalle cache condivise) può quindi
servire una versione con lo stato di segui/salva vecchio di qualche decina di
secondi dopo un'azione, ed è anche il vettore più probabile per cui la pagina
sembra "non essersi accorta" del segui/salva appena fatto altrove. Le pagine
gemelle già corrette (`/libreria`, `/profilo`, `/profilo/impostazioni`) usano
`private, no-store` — uniformiamoci.

- [ ] In ciascuno dei 4 file, sostituire l'header esistente con
      `setHeaders({ 'cache-control': 'private, no-store' });`
- [ ] `npm run check` (nessun tipo rotto, sono solo stringhe)
- [ ] Verifica manuale dopo il Task 3 (assieme agli altri fix di gruppo A)

### Task 2: `invalidateAll()` dopo ogni mutazione ottimistica ancora priva di esso

**Files:**

- Modify: `src/lib/components/UserRow.svelte` (dentro `toggleFollow`)
- Modify: `src/routes/(app)/u/[username]/+page.svelte` (dentro `toggleFollow`)
- Modify: `src/lib/components/PillCard.svelte` (dentro `toggleSave`)
- Modify: `src/routes/(app)/pillole/[id]/+page.svelte` (dentro `toggleSave` e `toggleFavorite`)

**Perché:** ogni componente aggiorna già lo stato locale in modo ottimistico
(verificato: nessuna di queste azioni "non si aggiorna" nel componente dove è
stata cliccata). Il problema è che SvelteKit tiene una cache dei `load` già
eseguiti in questa sessione browser e la riusa alla prossima navigazione
(inclusi i link precaricati al passaggio del mouse, `data-sveltekit-preload-data`,
attivo di default): senza invalidazione esplicita, navigare altrove e poi
tornare — o entrare per la prima volta in una pagina il cui link era stato
preclaricato prima dell'azione — può mostrare dati non più freschi.
`invalidateAll()` è già usato con questo scopo altrove nel codice (dopo
login, salvataggio pillola, cambio profilo): qui manca sulle azioni social.

- [ ] `UserRow.svelte`: import `invalidateAll` da `$app/navigation`; dopo il
      blocco `try` che fa la `fetch` (dopo la riga che alza `toast.error` in
      caso di fallimento, cioè **solo se `res.ok`**), chiamare
      `await invalidateAll();`
- [ ] Stessa modifica in `u/[username]/+page.svelte`, dentro `toggleFollow`
- [ ] Stessa modifica in `PillCard.svelte`, dentro `toggleSave`, dopo aver
      riallineato `pill.saveCount`
- [ ] Stessa modifica in `pillole/[id]/+page.svelte`, sia in `toggleSave` che
      in `toggleFavorite`
- [ ] `npm run check`
- [ ] Verifica manuale (vedi Task 3): seguire qualcuno dalla lista cerca,
      entrare nel suo profilo → bottone già "Seguito"; salvare una pillola dal
      feed, aprirla → bottone già "Nella tua libreria"

### Task 3: bfcache — richiesta sicurezza sullo stack di navigazione

**Files:**

- Modify: `src/routes/(app)/+layout.svelte`

**Perché:** Chrome/Safari possono ripristinare una pagina già renderizzata
(bfcache) quando si preme "indietro", **senza rieseguire alcun `load`**,
anche per pagine che diventano stale — è il caso in cui, su un dispositivo
condiviso, si fa logout e poi "indietro" mostra ancora l'header con
l'avatar/nome dell'account precedente finché non si interagisce. Impostare
`no-store` (Task 1) riduce il rischio ma non lo elimina su tutti i browser: la
difesa robusta è intercettare il ripristino da bfcache e forzare un
ricontrollo della sessione.

- [ ] In `<script>`, aggiungere:
  ```ts
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';

  onMount(() => {
  	function onPageShow(e: PageTransitionEvent) {
  		if (e.persisted) invalidateAll();
  	}
  	window.addEventListener('pageshow', onPageShow);
  	return () => window.removeEventListener('pageshow', onPageShow);
  });
  ```
- [ ] `npm run check`
- [ ] Verifica manuale: login → `/profilo` → logout → premere "indietro" del
      browser: l'header non deve mostrare più l'avatar dell'account
      precedente (deve riflettere lo stato sloggato entro un istante).

---

## Gruppo B — Bug ricerca persone / profilo pubblico: pillCount

### Task 4: Qualificare esplicitamente `user.id` nelle subquery correlate

**Files:**

- Modify: `src/lib/server/services/social-service.ts:1-4` (import), `:35-75`
  (`getProfileByUsername`), `:82-124` (`searchUsers`)
- Test: `tests/social/follow-and-search.spec.ts:68-79`

**Interfaces:**

- Consumes: `pill`, `user` da `../db/schema` (già importati)
- Produces: nessuna firma cambia — `getProfileByUsername` e `searchUsers`
  restano con la stessa signature, solo il valore di `pillCount` cambia da
  quasi-sempre-0 a corretto.

- [ ] **Step 1 — Estendere il test esistente per far fallire ora il bug**

  In `tests/social/follow-and-search.spec.ts`, nel test
  `'la ricerca utenti trova per prefisso di username'` (righe 68-79),
  aggiungere dopo la pubblicazione di una pillola dell'utente cercato:

  ```ts
  test('la ricerca utenti trova per prefisso di username e conta le pillole pubbliche', async () => {
  	const { user, api } = await registerAndVerifyUser();
  	await api.createPill(uniquePill({ isPublic: true }));

  	const prefix = user.username.slice(0, user.username.length - 4);
  	const res = await newClient().search({ tipo: 'persone', q: prefix });
  	expect(res.status).toBe(200);
  	const body = await res.json();
  	const found = body.users.find((u: { username: string }) => u.username === user.username);
  	expect(found).toBeTruthy();
  	expect(found.pillCount).toBe(1);
  });
  ```

  (sostituisce il test precedente allo stesso nome/scopo — stesso file,
  stessa `describe`).

- [ ] **Step 2 — Eseguire e verificare che fallisca**

  Serve `.env.test` configurato (vedi CLAUDE.md §6, "Suite di test
  blackbox" — database dedicato ai test, mai lo stesso di produzione senza
  `ALLOW_SAME_DB=true`, e quella variabile **non va riattivata** ora che il
  DB ha utenti reali). Se non è disponibile un `.env.test` in questa
  macchina, saltare questo step e verificare invece con lo script di sola
  lettura già usato in fase di analisi (query diretta), poi procedere allo
  Step 3 comunque: il bug è già stato riprodotto dal vivo prima di scrivere
  questo piano.

  ```bash
  npm run test:e2e -- tests/social/follow-and-search.spec.ts
  ```

  Atteso: FAIL su `expect(found.pillCount).toBe(1)` (riceve 0).

- [ ] **Step 3 — Fix**

  In `social-service.ts`, aggiungere l'import:

  ```ts
  import { getTableName } from 'drizzle-orm';
  ```

  In `getProfileByUsername` (pillCount, righe 47-50), sostituire:

  ```ts
  pillCount: sql<number>`(
  	select count(*)::int from ${pill}
  	where ${pill.authorId} = ${sql.raw(`"${getTableName(user)}"."id"`)} and ${pill.isPublic} = true
  )`,
  ```

  Stessa sostituzione in `searchUsers` (righe 99-102). Non toccare
  `getConnections` (già corretta, verificato con `.toSQL()`) né
  `getSuggestedUsers` (usa un join reale, non una subquery).

  Commento da aggiungere sopra la prima occorrenza (spiega il perché, non
  l'ovvio — per la convenzione CLAUDE.md):

  ```ts
  // ATTENZIONE: qui l'outer query tocca una sola tabella (solo "user"), quindi
  // Drizzle non qualifica i nomi colonna nemmeno dentro questo frammento sql —
  // "id" non qualificato risolverebbe alla "pill.id" locale della subquery
  // invece che a "user.id" esterno (entrambe le tabelle hanno una colonna
  // "id"), azzerando il conteggio. Va qualificato a mano. Vedi CLAUDE.md,
  // trappola #15.
  ```

- [ ] **Step 4 — Rieseguire e verificare che passi**

  ```bash
  npm run test:e2e -- tests/social/follow-and-search.spec.ts
  ```

  Atteso: PASS.

- [ ] **Step 5 — Verifica manuale supplementare**

  Con `npm run dev`, cercare "persone" un utente che ha almeno una pillola
  pubblica (es. uno dei 100 account `@seed.invalid`) e controllare che il
  conteggio non sia 0; aprire il suo profilo pubblico `/u/<username>` e
  controllare lo stesso per il numero "pillole" in cima.

- [ ] **Step 6 — Commit**
  ```bash
  git add src/lib/server/services/social-service.ts tests/social/follow-and-search.spec.ts
  git commit -m "fix: qualifica user.id nelle subquery di pillCount, azzerava sempre il conteggio"
  ```

### Task 5: Nuova trappola in CLAUDE.md

**Files:**

- Modify: `CLAUDE.md` (§4, nuova voce "#15"; §7, se il problema era elencato —
  non lo è: è un bug nuovo trovato in questa sessione, non dell'audit del 4
  settembre; §8 changelog)

- [ ] Aggiungere §4 trappola #15 con sintomo → causa → rimedio, riprendendo i
      fatti verificati sopra (subquery correlata, `.from()` a singola tabella,
      collisione `pill.id`/`user.id`, verificato con `.toSQL()`).
- [ ] Aggiungere voce in §8 changelog con data odierna.

---

## Gruppo C — Bug libreria: verifica dal vivo

### Task 6: Riprodurre (o escludere) il redirect a `/accedi` da `/libreria` dopo login

**Files:**

- Test: nuovo test temporaneo in `tests/auth/login-logout.spec.ts` (o file
  a parte se preferibile) — **da eseguire dopo** i Task 1-3 (Gruppo A), non
  prima: se il bug era dovuto a cache/preload stale, potrebbe già sparire.

- [ ] Scrivere un test che usa un vero browser (non solo `ApiClient`): login
      dalla UI (`/accedi`, form vero) con `next=/libreria`, poi verificare che
      la pagina finale sia `/libreria` e non un redirect a `/accedi`. Poi,
      separatamente, un secondo scenario: da sloggato, fare hover/visita del
      link "Libreria" nella `TabBar` (per far scattare eventuale preload),
      poi login, poi click reale sul tab "Libreria" — verificare che non
      torni alla schermata di login.
- [ ] Eseguire il test. Se **passa** con i fix del Gruppo A già applicati:
      annotare in CLAUDE.md (§8 changelog) che il bug non si riproduce più
      dopo l'uniformazione di cache/invalidazione, stessa struttura già usata
      per la trappola #10 ("verificato e non si riproduce"). Nessun altro
      fix necessario.
- [ ] Se **fallisce**: investigare da quello che si osserva (status della
      risposta, contenuto di `event.locals.user` loggato temporaneamente) e
      correggere di conseguenza — non prescrivibile in anticipo senza aver
      visto il fallimento reale (systematic-debugging: riprodurre prima di
      proporre un fix).
- [ ] Se il test viene mantenuto nella suite permanente, dargli un nome
      descrittivo e committarlo; se era solo diagnostico e il bug non si
      riproduce, si può anche ridurlo a un test minimo di regressione
      ("dopo login, /libreria non reindirizza a /accedi") invece di
      cancellarlo.

---

## Gruppo D — Sezione Profilo: split in 3 pagine + tema + eliminazione account

### Task 7: Nascondere la verifica email e sbloccare la pubblicazione

**Files:**

- Modify: `src/lib/server/guards.ts:31-37` (`canPublish`)
- Modify: `src/routes/(app)/+layout.svelte:54-70` (banner — rimuovere tutto il blocco `{#if data.user && !data.user.emailVerified}...{/if}`)
- Modify: `src/lib/components/PillEditor.svelte:404-413` (testo/link quando `!canPublish`)

**Perché:** deciso con l'utente (AskUserQuestion): dato che senza
`RESEND_API_KEY` nessuno può mai verificare l'email, tenere il requisito
`emailVerified` in `canPublish` blocca la pubblicazione per chiunque, per
sempre, senza un percorso d'uscita. Si toglie il requisito (resta solo lo
username) e si nasconde tutta la UI che parla di verifica email. Quando
Resend sarà configurato, si potrà reintrodurre — è una scelta reversibile
(vedi CLAUDE.md, stile della voce "non un bug, una scelta" del 2026-09-06).

- [ ] `guards.ts`: `canPublish` diventa
  ```ts
  /** Pubblicare richiede solo uno username: la verifica email è sospesa
   *  (nessuna email parte senza RESEND_API_KEY, vedi CLAUDE.md trappola #8) —
   *  altrimenti nessuno potrebbe mai pubblicare. */
  export function canPublish(user: AppUser): boolean {
  	return Boolean(user.username);
  }
  ```
- [ ] `(app)/+layout.svelte`: rimuovere il blocco banner (righe 54-70) e
      l'import di `Icon` se resta inutilizzato altrove nel file (verificare
      con grep prima di toccare l'import).
- [ ] `PillEditor.svelte`: il testo quando `!canPublish` diventa
      `Per pubblicare serve uno username.` con link a `/profilo/modifica`
      (non più `/profilo/impostazioni` — vedi Task 8).
- [ ] `npm run check`

### Task 8: Nuova route `/profilo/modifica` — solo anagrafica

**Files:**

- Create: `src/routes/(app)/profilo/modifica/+page.server.ts`
- Create: `src/routes/(app)/profilo/modifica/+page.svelte`

**Interfaces:**

- Consumes: `PUT /api/profilo` (invariato, `src/routes/api/profilo/+server.ts`),
  `profileUpdateSchema` da `$lib/domain/validation` (invariato)
- Produces: nulla di nuovo consumato da altri task

- [ ] `+page.server.ts`: stessa struttura di
      `profilo/impostazioni/+page.server.ts` attuale (redirect se
      `!locals.user`, `cache-control: private, no-store`), ma **senza** la
      query su `account` (quella serve solo per `hasPassword`/`linkedProviders`,
      che si spostano in `/profilo/sicurezza`, Task 9) — restituisce solo
      `{ profile: { firstName, lastName, username, birthDate, bio } }`.
- [ ] `+page.svelte`: stesso markup della sezione "Dati personali" già
      esistente in `profilo/impostazioni/+page.svelte` (righe 172-263), con
      lo stesso `saveProfile()` invariato. Header della pagina: "Modifica
      profilo" (non più "Account e sicurezza"). Link "← Profilo" in cima
      invariato (torna a `/profilo`).
- [ ] `npm run check`
- [ ] Verifica manuale: `npm run dev`, `/profilo/modifica`, cambiare nome e
      salvare, controllare che compaia in `/profilo`.

### Task 9: Nuova route `/profilo/sicurezza` — email, password, eliminazione account

**Files:**

- Modify: `src/lib/server/auth.ts:111-113` (`user.changeEmail`)
- Create: `src/routes/(app)/profilo/sicurezza/+page.server.ts`
- Create: `src/routes/(app)/profilo/sicurezza/+page.svelte`

**Interfaces:**

- Consumes: `authClient.changeEmail({ newEmail, callbackURL })`,
  `authClient.changePassword(...)` (già usato, invariato),
  `authClient.deleteUser({ password? })` — tutti da `$lib/auth-client`
  chiamati come `authClient.X(...)` diretto (stesso stile già in uso per
  `authClient.sendVerificationEmail` prima di questa sessione).

- [ ] `auth.ts`, dentro `user: { changeEmail: { enabled: true } }`, aggiungere
      `updateEmailWithoutVerification: true` (vedi "Fatti verificati" #3 sopra
      — necessario perché il cambio email funzioni per davvero oggi; il
      flag si applica solo quando l'email attuale non è verificata, quindi
      quando in futuro la verifica funzionerà per un utente specifico, per
      _quell'utente_ il cambio tornerà a richiedere conferma via email, come
      da comportamento Better Auth standard):
  ```ts
  user: {
  	changeEmail: { enabled: true, updateEmailWithoutVerification: true },
  	deleteUser: { enabled: true },
  	...
  }
  ```
- [ ] `+page.server.ts`: stessa query su `account` già presente in
      `profilo/impostazioni/+page.server.ts` attuale (per `hasPassword`/
      `linkedProviders`), redirect se non loggato, `no-store`. Restituisce
      `{ email: me.email, hasPassword, linkedProviders }` (niente più
      `profile`/`emailVerified`: non servono più su questa pagina).
- [ ] `+page.svelte`, tre sezioni:
  1. **Cambia email** — form con un solo campo (nuova email), submit chiama:
     ```ts
     const { error } = await authClient.changeEmail({
     	newEmail,
     	callbackURL: '/profilo/sicurezza'
     });
     if (error) {
     	/* toast.error con error.message */
     } else {
     	toast.success('Email aggiornata');
     	await invalidateAll();
     	newEmail = '';
     }
     ```
     Mostrare comunque l'email attuale (`data.email`) sopra il form.
     **Non** mostrare badge/stato di verifica (nascosto per decisione Task 7).
  2. **Cambia password** — markup e `changePassword()` spostati **verbatim**
     da `profilo/impostazioni/+page.svelte` (righe 53-90, 265-303), stessa
     condizione `{#if data.hasPassword}`.
  3. **Chiudi il tuo account** — sezione distinta (stile pericoloso, es.
     `border-color: var(--c-danger)` o simile al pattern già usato per i
     bottoni distruttivi), un bottone "Chiudi account" che apre un
     `<dialog>` nativo (stesso pattern già in `pillole/[id]/+page.svelte:262-288`,
     `showModal()`/focus-trap/Esc gratis) con:
     - testo di avviso: "Questa azione è immediata e non si può annullare.
       Tutte le tue pillole, i salvataggi e i follow spariscono per sempre."
     - se `data.hasPassword`: campo password (riusa `PasswordField.svelte`)
     - bottone "Elimina definitivamente" (stile `btn-danger`, come nel
       dialog di eliminazione pillola) che chiama:
       ```ts
       const { error } = await authClient.deleteUser(
       	data.hasPassword ? { password: deletePassword } : {}
       );
       if (error) {
       	toast.error('Password errata o operazione non riuscita.');
       	return;
       }
       await goto('/');
       ```
       (non serve un `signOut()` esplicito: `deleteUser` cancella anche la
       riga `session` lato server tramite `internalAdapter.deleteUserSessions`,
       e senza sessione valida il redirect a `/` renderizza già lo stato
       sloggato)
- [ ] `npm run check`
- [ ] Verifica manuale: `npm run dev`; cambiare email di un utente di prova
      `@example.invalid` e controllare che si aggiorni subito (l'utente non
      sarà mai verificato in locale senza Resend, quindi ricade nel percorso
      immediato); cambiare password; **su un account di prova creato apposta
      per questo test**, eliminarlo e verificare con una query diretta che la
      riga `user` (e le sue pillole) siano sparite.

### Task 10: Repurpose `/profilo/impostazioni` — solo tema, a 3 stati, persistito

**Files:**

- Modify: `src/routes/(app)/profilo/impostazioni/+page.server.ts` (semplificare: via la query su `account`, resta solo redirect+no-store, nessun dato da restituire)
- Modify: `src/routes/(app)/profilo/impostazioni/+page.svelte` (sostituire interamente il contenuto)
- Modify: `src/routes/(app)/+layout.svelte:5,28` (rimuovere `<ThemeToggle />` dall'header)
- Delete: `src/lib/components/ThemeToggle.svelte` (dopo aver verificato con
  grep che non è più importato da nessuna parte)

**Interfaces:**

- Produces: nessuna funzione condivisa nuova — la logica di tema resta
  localizzata nella pagina impostazioni, stesso `localStorage` key
  `pillole:theme` già letto da `src/app.html:38-47` (**non toccare
  app.html**: lo script anti-flash già gestisce correttamente il caso
  "nessuna preferenza salvata" = sistema).

- [ ] `+page.server.ts`: solo
  ```ts
  export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
  	if (!locals.user) redirect(303, `/accedi?next=${encodeURIComponent(url.pathname)}`);
  	setHeaders({ 'cache-control': 'private, no-store' });
  };
  ```
- [ ] `+page.svelte`: selettore a 3 stati (chiaro / scuro / di sistema), es.
      un `role="radiogroup"` di 3 bottoni. Stato letto/scritto così:
  ```ts
  import { browser } from '$app/environment';

  type ThemePref = 'light' | 'dark' | 'system';

  function currentPref(): ThemePref {
  	if (!browser) return 'system';
  	try {
  		const stored = localStorage.getItem('pillole:theme');
  		if (stored === 'light' || stored === 'dark') return stored;
  	} catch {}
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
  ```
  Tre bottoni (icone `sun`/`moon`/... per "sistema" si può riusare `globe` o
  un nuovo path — **non inventare un'icona nuova senza verificarla come nel
  Task fix-icona**: più semplice riusare `Icon name="loader"` no — usare
  testo pieno "Chiaro"/"Scuro"/"Automatico" con icona `sun`/`moon`/`sparkles`
  già presenti in `ICONS`, nessuna nuova icona necessaria), ciascuno con
  `aria-pressed={pref === '...'}` e `onclick={() => apply('...')}`.
- [ ] `(app)/+layout.svelte`: rimuovere `import ThemeToggle` e `<ThemeToggle />`.
- [ ] Grep `ThemeToggle` in tutto `src/` — se l'unico risultato rimasto è la
      definizione del file stesso, cancellare
      `src/lib/components/ThemeToggle.svelte`.
- [ ] `npm run check`
- [ ] Verifica manuale importante (esplicitamente richiesta dall'utente):
      impostare "Scuro" in `/profilo/impostazioni`, navigare in un'altra
      sezione (feed, libreria) → deve restare scuro; **ricaricare la pagina
      per intero (F5)** → deve restare scuro (lo script anti-flash in
      `app.html` legge la stessa chiave `pillole:theme`); tornare su
      "Automatico" → deve seguire il tema di sistema del sistema operativo/
      browser.

### Task 11: Aggiornare tutti i link alle vecchie destinazioni

**Files:**

- Modify: `src/routes/(app)/profilo/+page.svelte:65-68` ("Modifica profilo" → `/profilo/modifica`)
- Modify: `src/routes/(app)/profilo/+page.svelte:94-98` ("Account e sicurezza" → `/profilo/sicurezza`)
- Modify: `src/routes/(app)/profilo/+page.svelte:46-52` ("Scegli un username" quando manca → `/profilo/modifica`, non più `/profilo/impostazioni`)
- Modify: `src/routes/(app)/u/[username]/+page.svelte:90` ("Modifica il tuo profilo" → `/profilo/modifica`)

- [ ] Aggiornare i 4 `href`.
- [ ] Grep finale su tutto `src/` per `/profilo/impostazioni` — ogni
      occorrenza rimasta deve essere intenzionale (solo link che vogliono
      davvero aprire le impostazioni del tema, se ce ne sono).
- [ ] `npm run check`

### Task 12: Icona ingranaggio — path reale Lucide

**Files:**

- Modify: `src/lib/components/Icon.svelte:41-42`

- [ ] Sostituire il valore di `settings` in `ICONS` con:
  ```ts
  settings:
  	'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915',
  ```
  (verificato: cerchio r=3 nello stile già usato da `atom`/`info` nello
  stesso file; corpo ingranaggio scaricato verbatim da
  `raw.githubusercontent.com/lucide-icons/lucide/main/icons/settings.svg`,
  licenza ISC — stessa licenza già dichiarata in cima al file).
- [ ] `npm run dev`, aprire `/profilo` e (da profilo pubblico proprio)
      `/u/<il-tuo-username>`, controllare visivamente l'icona accanto a
      "Modifica profilo"/"Modifica il tuo profilo".

---

## Gruppo E — Aggiornare i test che referenziano le vecchie route

### Task 13: `tests/a11y/axe-audit.spec.ts`

**Files:**

- Modify: `tests/a11y/axe-audit.spec.ts:83` (lista URL desktop)
- Modify: `tests/a11y/axe-audit.spec.ts:104` (lista URL tema scuro)

- [ ] Riga 83: sostituire `'/profilo/impostazioni'` con tre righe
      `'/profilo/modifica', '/profilo/sicurezza', '/profilo/impostazioni'`.
- [ ] Riga 104: stessa sostituzione.
- [ ] `npm run test:e2e -- tests/a11y/axe-audit.spec.ts` — atteso PASS (0
      violazioni WCAG anche sulle nuove pagine; se emerge qualcosa,
      correggere il markup delle nuove pagine, non abbassare la soglia).

### Task 14: Grep finale di sicurezza su tutta la suite

- [ ] `grep -rn "profilo/impostazioni\|ThemeToggle" tests/` — verificare che
      non resti nessun riferimento rotto.

---

## Gruppo F — Verifica finale

### Task 15: Suite completa e aggiornamento CLAUDE.md

- [ ] `npm run lint`
- [ ] `npm run check`
- [ ] `npm run test:e2e` (tutta la suite)
- [ ] `npm run dev` — percorso manuale completo:
  1. Login → feed: creare/vedere una pillola pubblica senza dover ricaricare
     la pagina dopo la navigazione dal form.
  2. Cerca "persone" → conteggio pillole corretto (Task 4).
  3. Seguire qualcuno dalla ricerca → entrare nel suo profilo → bottone già
     "Seguito" senza reload (Task 2).
  4. Salvare una pillola dal feed → aprirla → bottone già "Nella tua
     libreria" senza reload (Task 2).
  5. `/libreria` da autenticato, click dal tab in basso → nessun redirect al
     login (Task 6).
  6. `/profilo/modifica` → solo anagrafica; `/profilo/sicurezza` → email,
     password, elimina account; `/profilo/impostazioni` → solo tema, persiste
     dopo F5 (Task 8-10).
  7. Icona ingranaggio non più malformata (Task 12).
  8. Nessun banner/badge di verifica email in giro (Task 7).
  9. Pubblicare una pillola con un utente non verificato (tutti, oggi) →
     funziona (Task 7).
- [ ] Aggiornare `CLAUDE.md`: §4 (trappola #15 dal Task 5, se non già fatto),
      §5 (route di profilo cambiate, stato "cosa non funziona ancora" — la
      verifica email resta lì ma ora esplicitamente non bloccante), §7 (se
      qualche riga dell'audit del 4 settembre risulta chiusa da questo
      lavoro), §8 (nuova voce changelog con data odierna, commit finale).
- [ ] Commit finale (o commit incrementali per gruppo, a scelta di chi
      esegue — il piano non prescrive granularità di commit oltre al Task 4
      che ne ha uno dedicato per il fix con test).
