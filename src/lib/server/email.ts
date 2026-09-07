import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Invio email a costo zero.
 *
 * In produzione usa Resend (piano free: 3.000 email/mese, ~100/giorno —
 * abbondante per ~20 utenti attivi/giorno). Se `RESEND_API_KEY` non e'
 * configurata l'email viene solo loggata: in locale e' quello che vuoi,
 * in produzione e' un fallback rumoroso ma non bloccante.
 */
type Mail = { to: string; subject: string; html: string; text: string };

const FROM = env.MAIL_FROM ?? 'Pillole <onboarding@resend.dev>';

export async function sendMail({ to, subject, html, text }: Mail): Promise<void> {
	if (!env.RESEND_API_KEY) {
		/**
		 * Senza chiave non si spedisce, e in produzione NON scriviamo il corpo
		 * nei log: conterrebbe link di verifica e di reset password, cioe'
		 * segreti validi a tutti gli effetti.
		 *
		 * La conseguenza va detta a voce alta, perche' altrimenti la si scopre
		 * solo quando qualcuno resta chiuso fuori dal proprio account: finche'
		 * questa chiave manca, il recupero password non e' utilizzabile.
		 */
		console.warn(
			`[mail] RESEND_API_KEY assente: email "${subject}" NON inviata a ${redact(to)}. ` +
				'Finche manca, verifica email e recupero password non funzionano. ' +
				(dev
					? `Contenuto (mostrato solo in sviluppo):\n${text}`
					: 'Il link non viene registrato nei log per sicurezza.')
		);
		return;
	}

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ from: FROM, to: [to], subject, html, text })
	});

	if (!res.ok) {
		// Non propaghiamo il corpo della risposta all'utente: potrebbe contenere dettagli interni.
		console.error(`[mail] invio fallito (${res.status}) verso ${redact(to)}`);
		throw new Error('Invio email non riuscito');
	}
}

function redact(email: string): string {
	const [name, domain] = email.split('@');
	return `${name.slice(0, 2)}***@${domain ?? '?'}`;
}

/** Template minimale, leggibile anche nei client che bloccano il CSS. */
export function mailTemplate(opts: {
	heading: string;
	body: string;
	ctaLabel: string;
	ctaUrl: string;
}) {
	const html = `<!doctype html><html lang="it"><body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#be123c;letter-spacing:.08em;text-transform:uppercase">Pillole</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${escapeHtml(opts.heading)}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#334155">${escapeHtml(opts.body)}</p>
    <a href="${opts.ctaUrl}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:12px;font-size:16px">${escapeHtml(opts.ctaLabel)}</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#475569">Se il pulsante non funziona, copia questo link nel browser:<br><span style="word-break:break-all">${opts.ctaUrl}</span></p>
    <p style="margin:16px 0 0;font-size:13px;color:#475569">Se non hai richiesto tu questa email, ignorala pure.</p>
  </div>
</body></html>`;

	const text = `${opts.heading}\n\n${opts.body}\n\n${opts.ctaLabel}: ${opts.ctaUrl}\n\nSe non hai richiesto tu questa email, ignorala pure.`;
	return { html, text };
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
