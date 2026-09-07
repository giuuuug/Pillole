import katex from 'katex';

/* ============================================================
   OWASP A03 — Cross-Site Scripting
   Il corpo di una pillola e' testo scritto da un utente e finisce in
   `{@html}`. Regola: l'HTML non viene MAI preso dall'input — viene
   costruito qui da zero, e ogni frammento che proviene dall'utente
   passa da `escapeHtml`. Non esiste un percorso in cui markup grezzo
   dell'utente arrivi al DOM.
   ============================================================ */

export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Solo http/https sopravvivono: `javascript:` e `data:` diventano testo. */
export function sanitizeUrl(url: string): string | null {
	try {
		const u = new URL(url.trim());
		return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
	} catch {
		return null;
	}
}

function renderMath(src: string, displayMode: boolean): string {
	try {
		return katex.renderToString(src, {
			displayMode,
			throwOnError: false,
			// `trust: false` disabilita \htmlClass, \href, \includegraphics e
			// ogni comando KaTeX capace di iniettare HTML arbitrario.
			trust: false,
			strict: false,
			output: 'htmlAndMathml',
			maxSize: 50,
			maxExpand: 1000
		});
	} catch {
		return `<code class="katex-error">${escapeHtml(src)}</code>`;
	}
}

/** Markdown minimo: grassetto, corsivo, codice, link. Niente HTML grezzo. */
function renderInlineText(text: string): string {
	let out = escapeHtml(text);

	// `codice`
	out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
	// **grassetto**
	out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
	// *corsivo*
	out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
	// [testo](url) — l'URL viene ri-validato, il testo e' gia' escaped
	out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, rawUrl: string) => {
		const href = sanitizeUrl(rawUrl.replace(/&amp;/g, '&'));
		if (!href) return match;
		return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
	});

	return out;
}

type Segment = { type: 'text' | 'inline-math' | 'block-math'; value: string };

/**
 * Divide il corpo in testo e formule. `$$...$$` diventa un blocco centrato,
 * `$...$` resta nel flusso della frase. `\$` scrive un dollaro letterale.
 */
export function tokenize(body: string): Segment[] {
	const segments: Segment[] = [];
	let buffer = '';
	let i = 0;

	const flush = () => {
		if (buffer) {
			segments.push({ type: 'text', value: buffer });
			buffer = '';
		}
	};

	while (i < body.length) {
		const ch = body[i];

		if (ch === '\\' && body[i + 1] === '$') {
			buffer += '$';
			i += 2;
			continue;
		}

		if (ch === '$') {
			const isBlock = body[i + 1] === '$';
			const delim = isBlock ? '$$' : '$';
			const start = i + delim.length;
			const end = body.indexOf(delim, start);

			// Delimitatore non chiuso: e' semplicemente un dollaro nel testo.
			if (end === -1) {
				buffer += ch;
				i += 1;
				continue;
			}

			const content = body.slice(start, end);
			if (content.trim()) {
				flush();
				segments.push({ type: isBlock ? 'block-math' : 'inline-math', value: content });
			} else {
				buffer += delim + delim;
			}
			i = end + delim.length;
			continue;
		}

		buffer += ch;
		i += 1;
	}

	flush();
	return segments;
}

/**
 * Rende il corpo di una pillola in HTML sicuro.
 * @param format 'text' salta del tutto il parser LaTeX (piu' veloce e
 *               nessuna sorpresa per chi scrive prezzi in dollari).
 */
export function renderPillBody(body: string, format: string): string {
	if (format !== 'latex') {
		return paragraphs(body, renderInlineText);
	}

	const segments = tokenize(body);

	return segments
		.map((seg) => {
			if (seg.type === 'block-math') return renderMath(seg.value, true);
			if (seg.type === 'inline-math') return renderMath(seg.value, false);
			return paragraphs(seg.value, renderInlineText);
		})
		.join('');
}

/** Righe vuote separano i paragrafi; una riga singola diventa un <br>. */
function paragraphs(text: string, inline: (s: string) => string): string {
	return text
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean)
		.map((block) => `<p>${inline(block).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

/** Anteprima testuale pulita: niente markup, niente LaTeX, per feed e meta tag. */
export function toPlainText(body: string, max = 200): string {
	const stripped = body
		.replace(/\$\$[\s\S]*?\$\$/g, ' [formula] ')
		.replace(/\$[^$\n]*\$/g, ' [formula] ')
		.replace(/[*`_#>]/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();

	return stripped.length > max ? `${stripped.slice(0, max - 1).trimEnd()}…` : stripped;
}
