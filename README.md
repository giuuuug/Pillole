<div align="center">
  <img src="static/img/icon-512.png" alt="Pillole logo" width="112" />

# Pillole

**A pill of knowledge is a concept boiled down to its core** — the kind of
thing you'd explain to a friend at a bar in two minutes.

[![CI](https://github.com/giuuuug/Pillole/actions/workflows/ci.yml/badge.svg)](https://github.com/giuuuug/Pillole/actions/workflows/ci.yml)
![SvelteKit](https://img.shields.io/badge/SvelteKit-2-ff3e00?logo=svelte&logoColor=white)
![Cost](https://img.shields.io/badge/running%20cost-%E2%82%AC0%2Fmonth-informational)

[**Live app**](https://pillole.netlify.app) · [Report a bug](https://github.com/giuuuug/Pillole/issues/new) · [Suggest an idea](https://github.com/giuuuug/Pillole/issues/new)
</div>

---

You're out with friends. Somewhere between one topic and the next you mention
you know a thing, and you start explaining how a microwave actually works and
the physics behind it. Briefly. That's a pill of knowledge.

Now imagine every one of those got written down. That's Pillole — a personal
library of what you know, and a feed of what other people know, if you feel
like sharing.

> _Pillole_ is Italian for "pills". The product itself speaks Italian to its
> users; this README speaks English to contributors.

## Features

- 📚 **A library that's yours.** Every pill lands on a themed shelf — maths,
  physics, tech, history, and more. Private by default, always.
- 🌍 **A feed, on your terms.** One explicit tap makes a pill public. Follow
  people, and save their pills into your library as a live reference, never a
  frozen copy.
- 🧮 **Maths that actually renders.** Plain text or LaTeX, live preview as you
  type — `$E=mc^2$` inline, `$$...$$` on its own line.
- 🔗 **Sources, always.** Up to ten per pill, so a claim can be traced back.
- ♿ **Built for 14 to 99 year-olds.** Real contrast ratios, real touch
  targets, real keyboard support — not an afterthought. See
  [Accessibility](#accessibility--security).

## Quick start

You'll need Node 22+, a free [Netlify](https://netlify.com) account, and a
free [Neon](https://neon.tech) Postgres database (Netlify DB uses Neon under
the hood, so a plain Neon project works just as well for local dev).

```bash
git clone https://github.com/giuuuug/Pillole.git
cd Pillole
npm install

cp .env.example .env      # then fill in DATABASE_URL and BETTER_AUTH_SECRET, see below

npm run db:migrate        # create the tables
npm run db:seed           # load the categories
npm run dev                # → http://localhost:5173
```

<details>
<summary><strong>Environment variables</strong></summary>

<br>

| Variable                      | Required | Notes                                                                                           |
| ----------------------------- | :------: | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                |    ✅    | Pooled Postgres connection string. **Use your own dev database**, never production — see below. |
| `DATABASE_URL_UNPOOLED`       |          | Direct connection, used only by migrations. Falls back to `DATABASE_URL`.                       |
| `BETTER_AUTH_SECRET`          |    ✅    | `openssl rand -base64 32`. A different one per environment.                                     |
| `BETTER_AUTH_URL`             |    ✅    | The app's own URL (`http://localhost:5173` locally).                                            |
| `RESEND_API_KEY`, `MAIL_FROM` |          | Without them, emails are just logged to the console — nothing breaks.                           |
| `GOOGLE_CLIENT_ID/SECRET`     |          | The Google sign-in button only renders once these exist.                                        |
| `APPLE_CLIENT_ID/SECRET`      |          | Same, for Apple.                                                                                |

**Never point your local `.env` at the production database.** The simplest
free setup is a separate Neon **branch** (or a whole separate free project):
open the Netlify DB's underlying project on
[console.neon.tech](https://console.neon.tech), branch it, and copy that
branch's connection strings into your local `.env`.

</details>

<details>
<summary><strong>All scripts</strong></summary>

<br>

```bash
npm run dev          # dev server
npm run check        # type checking
npm run lint          # prettier + eslint
npm run format         # fix formatting
npm run build         # production build
npm run db:generate   # generate a migration after changing the schema
npm run db:migrate    # apply migrations
npm run db:seed        # (re)load categories — idempotent
npm run db:studio      # database browser
npm run test:e2e       # Playwright blackbox suite
```

</details>

## Contributing

Issues and pull requests are welcome — this is a small, opinionated project,
so for anything bigger than a bug fix, opening an issue first saves everyone
a rewritten PR.

1. Fork the repo and branch off `develop` (that's where day-to-day work
   happens; `main` is production and deploys automatically on merge).
2. Before opening a PR, run the same checks CI runs:
   ```bash
   npm run lint && npm run check && npm run build
   ```
3. Open the PR against `develop`. A GitHub Actions workflow lints, type-checks,
   builds, and audits dependencies on every push — keep it green.

Curious _why_ something is built the way it is — a driver choice, a security
trade-off, a bug that shaped the current design? **[`CLAUDE.md`](./CLAUDE.md)**
is this project's running decision log: every non-obvious call, and the
incident that motivated it, in one place. Read it before touching auth,
caching, or the database layer.

## Tech stack

| Layer     | Choice                              | Why                                                 |
| --------- | ----------------------------------- | --------------------------------------------------- |
| Framework | SvelteKit 2 + Svelte 5 + TypeScript | SSR for the first paint, runes for client state     |
| Styling   | Tailwind CSS 4 + CSS tokens         | Colour, spacing and type live in one place          |
| Database  | Netlify DB (Neon) + Drizzle ORM     | Managed Postgres, free tier, stateless HTTP driver  |
| Auth      | Better Auth                         | Credentials + Google + Apple, email verification    |
| Maths     | KaTeX                               | Synchronous rendering, no network request           |
| Hosting   | Netlify                             | Git-driven deploys, serverless functions, free tier |

## Project layout

```
src/
├── lib/
│   ├── components/     # Reusable UI (Icon, PillCard, PillEditor…)
│   ├── domain/         # Categories & validation — shared by client and server
│   ├── client/         # Client-side state: pagination, toasts
│   ├── server/
│   │   ├── db/         # Drizzle schema + connection
│   │   ├── services/   # Domain logic: pills, social
│   │   ├── auth.ts     # Better Auth configuration
│   │   └── guards.ts   # Authorisation, validation, rate limiting
│   └── utils/           # Safe rendering (LaTeX/markdown), formatting
└── routes/
    ├── (app)/           # Authenticated app: feed, library, profile, pills
    ├── (auth)/          # Sign in, sign up, password recovery
    └── api/              # JSON endpoints
```

Validation schemas in `src/lib/domain/validation.ts` are shared by client and
server, so the message a user reads and the rule that actually applies can
never drift apart. Route segments and product copy are in Italian
(`/libreria`, `/cerca`); code identifiers are in English.

## Deploying

Netlify auto-deploys `main` on every push; `develop` gets its own preview URL.
Database migrations are **not** part of the build — they run manually, once,
against production:

```bash
npm run db:generate   # after changing src/lib/server/db/schema.ts
# review the generated SQL under drizzle/, then, pointed at production:
npm run db:migrate
```

Full first-time Netlify setup, rollback steps, and the reasoning behind
running migrations by hand are in [`CLAUDE.md`](./CLAUDE.md#6-come-si-lavora).

## Accessibility & security

<details>
<summary>The audience is 14 to 99 years old, so these aren't optional</summary>

<br>

- Base text is **17px**, line height 1.6.
- Every text/background pair clears 4.5:1 contrast — most clear 7:1 — in both
  light and dark themes.
- Touch targets ≥ 44×44px, with breathing room between them.
- Keyboard focus is always visible.
- Colour never carries meaning alone: icons and labels back it up.
- `prefers-reduced-motion` turns every animation off.
- SVG icons only — never emoji as UI.

</details>

<details>
<summary>OWASP Top 10, one mitigation each</summary>

<br>

| Risk                      | Mitigation                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Broken Access Control     | Authorisation lives **inside** the query, not a separate `if`. Someone else's private pill is a 404, not a 403. |
| Cryptographic Failures    | `httpOnly` + `Secure` + `SameSite=Lax` cookies, HSTS, hashed passwords.                                         |
| Injection / XSS           | Parameterised queries; pill bodies are rendered from escaped text, never raw markup.                            |
| Insecure Design           | Private by default; minimum age 14.                                                                             |
| Security Misconfiguration | CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.                                     |
| Vulnerable Components     | `npm audit --audit-level=high` on every CI run.                                                                 |
| Auth Failures             | Per-route rate limits; no error message reveals which emails exist.                                             |
| Data Integrity            | `npm ci` from the lockfile; every migration is versioned in `drizzle/`.                                         |
| Logging Failures          | Errors are logged server-side against an id; the user only ever sees the id.                                    |
| SSRF                      | Sources are links shown to the user — the server never fetches them.                                            |

</details>

## License

Not chosen yet — until it is, all rights are reserved by default. If you'd
like to contribute, open an issue first; a proper open-source license is on
the to-do list.
