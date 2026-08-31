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
/* The seven documents in reading order. This is a real sequence — each one
 * assumes the ones before it — so the position is information, not decoration,
 * and it is what the previous/next links walk. */
const ORDER = [
  ['docs/project-overview.md',     'project-overview',     'プロジェクト概要'],
  ['docs/architecture.md',         'architecture',         'アーキテクチャ'],
  ['docs/development-approach.md', 'development-approach', '開発の進め方'],
  ['docs/how-to-join.md',          'how-to-join',          '参加方法'],
  ['docs/workshop/README.md',      'workshop',             'ワークショップ'],
  ['docs/roadmap.md',              'roadmap',              'ロードマップ'],
  ['docs/faq.md',                  'faq',                  'よくある質問']
];

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

  dropRepoBacklink(body);
  rewriteLinks(body, path);
  headings(body);
  alerts(body);
  tables(body);
  mermaid(body);

  if (fallback) fallback.remove();
  host.appendChild(masthead(path, body));
  host.appendChild(body);
  buildToc(body);
  host.appendChild(nextPrev(path));

  /* The reading indicator is a scroll-driven CSS animation, but its timeline
   * is created when the rule first applies — and at that moment this page is
   * only a fallback link and has nothing to scroll, so the timeline comes up
   * inactive and the bar never moves. Attach it now that the document is in
   * the page and there is a scroll range for it to track. */
  document.documentElement.classList.add('doc-ready');
  readingProgress();

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

    /* Replace the block rather than annotate it. Leaving the source on screen
     * shows a visitor a wall of `flowchart LR` markup, which reads as a page
     * that failed to render — worse than showing nothing. The definition is
     * kept, folded away, so nothing is concealed. */
    const figure = document.createElement('figure');
    figure.className = 'diagram-swap';

    const link = document.createElement('a');
    link.className = 'diagram-swap-link';
    link.href = SITE + 'docs/diagrams/rebuild-lab-trust-boundary.html';
    link.innerHTML = '<strong>認証・認可の trust boundary</strong>'
      + '<span>境界と、各所で何を検証し、何をブラウザへ渡さないかまで含んだ図です。'
      + 'テーマ切替・検索・関係のたどり・拡大縮小が図の中で動きます。</span>'
      + '<span class="go">図を開く →</span>';
    figure.appendChild(link);

    const caption = document.createElement('figcaption');
    const fold = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'この位置にある簡略図の定義（mermaid）';
    fold.appendChild(summary);
    fold.appendChild(pre.cloneNode(true));
    caption.appendChild(fold);
    figure.appendChild(caption);

    pre.parentNode.replaceChild(figure, pre);
  }
}

/* ------------------------------------------------------------- progress */

/* How far through the document you are. Reading these is the whole point of
 * the page, so knowing how much is left is worth two pixels at the top. */
function readingProgress() {
  const bar = document.querySelector('.read-progress');
  if (!bar) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bar.remove();
    return;
  }

  let ticking = false;
  const paint = () => {
    ticking = false;
    const doc = document.documentElement;
    const span = doc.scrollHeight - window.innerHeight;
    const at = span > 0 ? Math.min(Math.max(window.scrollY / span, 0), 1) : 0;
    bar.style.transform = 'scaleX(' + at.toFixed(4) + ')';
  };
  const request = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  paint();
}

/* --------------------------------------------------------------- masthead */

/* Every document opens with a right-aligned "← README へ戻る" line. That is a
 * github.com navigation affordance; here it points off the site and sits above
 * the title, so it goes. The header below replaces what it was for. */
function dropRepoBacklink(scope) {
  const first = scope.firstElementChild;
  if (!first || first.tagName !== 'P') return;
  if (first.getAttribute('align') !== 'right') return;
  if (!/README/.test(first.textContent)) return;
  first.remove();
}

/* A readout of the document itself. Every figure is counted from what was just
 * rendered — nothing here is written by hand, so nothing can drift out of date
 * when the Markdown changes. */
function masthead(path, body) {
  const index = ORDER.findIndex((d) => d[0] === path);
  const chars = body.textContent.replace(/\s+/g, '').length;
  const facts = [
    ['出典', path],
    ['節', String(body.querySelectorAll('h2').length)],
    ['表', String(body.querySelectorAll('table').length)],
    ['読了', '約 ' + Math.max(1, Math.round(chars / 500)) + ' 分']
  ];

  const head = document.createElement('header');
  head.className = 'doc-head';

  if (index >= 0) {
    const pos = document.createElement('p');
    pos.className = 'doc-pos';
    pos.innerHTML = '<b>' + String(index + 1).padStart(2, '0') + '</b>'
      + ' <span>/ ' + String(ORDER.length).padStart(2, '0') + '</span> 文書';
    head.appendChild(pos);
  }

  const dl = document.createElement('dl');
  dl.className = 'doc-facts';
  for (const [k, v] of facts) {
    /* Each label and its value are wrapped together — valid inside a <dl> and
     * it stops a narrow screen from wrapping between the two, which reads as
     * a stray number. */
    const pair = document.createElement('div');
    pair.className = 'fact';
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    pair.appendChild(dt); pair.appendChild(dd);
    dl.appendChild(pair);
  }
  head.appendChild(dl);
  return head;
}

/* ------------------------------------------------------------- prev / next */

function nextPrev(path) {
  const i = ORDER.findIndex((d) => d[0] === path);
  const nav = document.createElement('nav');
  nav.className = 'doc-move';
  nav.setAttribute('aria-label', '前後の文書');
  if (i < 0) return nav;

  const make = (entry, dir, label) => {
    const a = document.createElement('a');
    a.href = SITE + 'read/' + entry[1] + '.html';
    a.className = 'move ' + dir;
    a.innerHTML = '<span class="move-label">' + label + '</span>'
      + '<span class="move-title">' + entry[2] + '</span>';
    return a;
  };
  if (i > 0) nav.appendChild(make(ORDER[i - 1], 'prev', '前の文書'));
  if (i < ORDER.length - 1) nav.appendChild(make(ORDER[i + 1], 'next', '次の文書'));
  return nav;
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
  items.forEach((h, n) => {
    /* Number the sections. These documents are argued in order, so the number
     * says something true; it also gives the contents a spine to hang on. */
    const num = String(n + 1).padStart(2, '0');
    const mark = document.createElement('span');
    mark.className = 'h-num';
    mark.textContent = num;
    h.insertBefore(mark, h.firstChild);

    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.innerHTML = '<span class="toc-num">' + num + '</span>'
      + h.textContent.replace(/^\d\d/, '').replace(/#$/, '').trim();
    li.appendChild(a);
    list.appendChild(li);
  });
  box.appendChild(list);

  nav.textContent = '';
  nav.appendChild(box);
  nav.hidden = false;
}
