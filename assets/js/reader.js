/* Renders one of this project's documents inside the site.
 *
 * The Markdown files are the single source of truth and are synced from the
 * development repository, so nothing is pre-generated here: the .md is fetched
 * and rendered in the browser. That keeps `.nojekyll` in place and adds no
 * build step (ADR 0028 D3).
 *
 * The hard part is not rendering, it is links. The documents are written to be
 * read on github.com, so their links are relative to the repository tree. Every
 * one has to be re-pointed: at this site when the target is rendered here, at
 * github.com otherwise. That is the layer that produced a page of 404s before,
 * so it is handled in one place, over the rendered DOM, which catches links
 * from raw HTML in the Markdown as well as Markdown links.
 *
 * Without JavaScript the page shows a link to the document on github.com,
 * which is where it was always readable.
 */

import { marked } from 'marked';

const REPO = 'https://github.com/greenwakame/ai-first-rebuild-lab';
const BLOB = REPO + '/blob/main/';
const SITE = '/ai-first-rebuild-lab/';

/* Documents rendered on this site, by their path in the repository. Anything
 * not listed here keeps going to github.com — that is the default, not a
 * failure, and it is what keeps ADR and reference/ where they belong. */
const ON_SITE = {
  'docs/project-overview.md':     SITE + 'read/project-overview.html',
  'docs/architecture.md':         SITE + 'read/architecture.html',
  'docs/development-approach.md': SITE + 'read/development-approach.html',
  'docs/how-to-join.md':          SITE + 'read/how-to-join.html',
  'docs/workshop/README.md':      SITE + 'read/workshop.html',
  'docs/roadmap.md':              SITE + 'read/roadmap.html',
  'docs/faq.md':                  SITE + 'read/faq.html'
};

const root = document.getElementById('doc');
if (root) render(root);

async function render(host) {
  const path = host.dataset.doc;
  const fallback = host.querySelector('.doc-fallback');

  /* Hide the fallback first, before anything that can fail. It is visible in
   * the markup so that a browser which never gets this far — scripting off,
   * no import map, the module failing to load — still shows the way to read
   * the document on github.com. */
  if (fallback) fallback.hidden = true;

  let text;
  try {
    const res = await fetch(SITE + path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    text = await res.text();
  } catch (err) {
    const why = document.getElementById('doc-fallback-why');
    if (why) why.textContent = 'この文書を読み込めませんでした。github.com 側の表示をご利用ください。内容は同じものです。';
    if (fallback) fallback.hidden = false;
    return;
  }

  const body = document.createElement('article');
  body.className = 'prose';
  body.innerHTML = marked.parse(text, { gfm: true, breaks: false });

  rewriteLinks(body, path);
  headings(body);
  alerts(body);
  tables(body);
  mermaid(body);

  if (fallback) fallback.remove();
  host.appendChild(body);
  buildToc(body);

  /* A hash in the URL could not resolve before the document existed. */
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }
}

/* ------------------------------------------------------------------ links */

/* Resolve a repository-relative href against the document's own directory,
 * the way the file would be read on github.com. */
function resolve(fromPath, href) {
  const base = fromPath.split('/').slice(0, -1);
  const parts = href.split('/');
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') base.pop();
    else base.push(part);
  }
  return base.join('/');
}

function rewriteLinks(scope, path) {
  for (const a of scope.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');

    /* Absolute, protocol-relative and in-page links are already correct. */
    if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) continue;

    /* Split the fragment off before resolving; GitHub keeps its own anchors,
     * so a fragment aimed at a github.com page is passed through untouched. */
    const hash = href.indexOf('#');
    const bare = hash === -1 ? href : href.slice(0, hash);
    const frag = hash === -1 ? '' : href.slice(hash);

    if (bare === '') continue;                    /* pure fragment, handled above */

    const target = resolve(path, bare);
    const here = ON_SITE[target];
    a.setAttribute('href', here ? here + frag : BLOB + target + frag);
    if (!here) a.classList.add('offsite');
  }
}

/* --------------------------------------------------------------- headings */

/* GitHub's slug: lower-cased, punctuation dropped, spaces to hyphens, and
 * letters of any script kept. Matching it means an anchor written for
 * github.com resolves the same way here. */
function slug(text) {
  return text.trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function headings(scope) {
  const used = new Map();
  for (const h of scope.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    let id = slug(h.textContent);
    if (!id) continue;
    /* GitHub appends -1, -2 … to repeats. */
    const n = used.get(id) || 0;
    used.set(id, n + 1);
    if (n) id += '-' + n;
    h.id = id;

    const anchor = document.createElement('a');
    anchor.className = 'anchor';
    anchor.href = '#' + id;
    anchor.setAttribute('aria-label', h.textContent + ' へのリンク');
    anchor.textContent = '#';
    h.appendChild(anchor);
  }
}

/* ----------------------------------------------------------------- alerts */

const ALERT = {
  NOTE: 'note', TIP: 'tip', IMPORTANT: 'important',
  WARNING: 'warning', CAUTION: 'caution'
};
const ALERT_LABEL = {
  note: 'Note', tip: 'Tip', important: 'Important',
  warning: 'Warning', caution: 'Caution'
};

/* GitHub renders `> [!NOTE]` as a callout. marked leaves it as a blockquote
 * whose first line still carries the marker, so it is converted here. */
function alerts(scope) {
  for (const q of scope.querySelectorAll('blockquote')) {
    const first = q.firstElementChild;
    if (!first) continue;
    const m = first.textContent.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
    if (!m) continue;

    const kind = ALERT[m[1]];
    q.classList.add('alert', 'alert-' + kind);

    /* Drop the marker from the text without disturbing the rest of the node. */
    const walker = document.createTreeWalker(first, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode();
    if (node) node.nodeValue = node.nodeValue.replace(/^\s*\[![A-Z]+\]\s*\n?/, '');
    if (!first.textContent.trim()) first.remove();

    const label = document.createElement('p');
    label.className = 'alert-label';
    label.textContent = ALERT_LABEL[kind];
    q.insertBefore(label, q.firstChild);
  }
}

/* ----------------------------------------------------------------- tables */

/* Wide tables scroll inside their own container so the page never does. */
function tables(scope) {
  for (const t of scope.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'tablewrap';
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('role', 'group');
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  }
}

/* ---------------------------------------------------------------- mermaid */

/* mermaid is not loaded — it is nearly a megabyte for the single diagram in
 * these documents, and that diagram already has an interactive counterpart
 * generated from the ADRs. Point at the real one instead of rendering a
 * lesser copy. */
function mermaid(scope) {
  for (const code of scope.querySelectorAll('pre > code.language-mermaid')) {
    const pre = code.parentElement;
    const note = document.createElement('p');
    note.className = 'mermaid-note';
    note.innerHTML = 'この図は簡略版です。境界と検証内容まで含む'
      + ' <a href="' + SITE + 'docs/diagrams/rebuild-lab-trust-boundary.html">'
      + '対話型の trust boundary 図</a> があります。';
    pre.parentNode.insertBefore(note, pre.nextSibling);
  }
}

/* -------------------------------------------------------------------- toc */

function buildToc(scope) {
  const nav = document.getElementById('doc-toc');
  if (!nav) return;
  const items = scope.querySelectorAll('h2');
  if (items.length < 3) { nav.remove(); return; }

  /* A disclosure rather than a plain list: on a phone six headings push the
   * document itself most of a screen down, and the point of the page is the
   * document. Open on wide screens, where it sits beside the text and costs
   * nothing. */
  const box = document.createElement('details');
  box.className = 'toc-box';
  box.open = window.matchMedia('(min-width: 1060px)').matches;

  const label = document.createElement('summary');
  label.className = 'toc-title';
  label.textContent = '目次';
  box.appendChild(label);

  const list = document.createElement('ol');
  for (const h of items) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    /* The heading carries a trailing anchor mark that does not belong here. */
    a.textContent = h.textContent.replace(/#$/, '').trim();
    li.appendChild(a);
    list.appendChild(li);
  }
  box.appendChild(list);

  nav.textContent = '';
  nav.appendChild(box);
  nav.hidden = false;
}
