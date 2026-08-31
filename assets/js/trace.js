/* The requirement traceability demo.
 *
 * One requirement ID has to appear at five sites. This section lets a visitor
 * break that chain and watch the corresponding rule fire, which answers the
 * question the rest of the page only asserts: if an agent writes the code,
 * what stops the spec and the code from drifting apart.
 *
 * Everything shown is published. The spec line is quoted verbatim from
 * docs/reference/requirements-md.md; the markers use the format that same
 * document fixes; the rules, severities and status machine are its section 4
 * and 5. The ledger's real contents are deliberately not published, so the
 * ledger station shows only the two fields the rules actually read, and says
 * so. Nothing here is invented.
 *
 * No third-party code: the connectors are CSS transforms, the state is a
 * string. Without JavaScript the chain still renders intact and readable;
 * only the controls are hidden.
 */
(function () {
  'use strict';

  var root = document.getElementById('trace');
  if (!root) return;

  var stations = root.querySelectorAll('.station');
  var readout = document.getElementById('trace-readout');
  var buttons = root.querySelectorAll('[data-break]');
  var resetBtn = root.querySelector('[data-reset]');
  if (!stations.length || !readout) return;

  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Each state names the rule the real checker would report, the station the
   * chain parts at, and what that station looks like once it is broken. */
  var STATES = {
    ok: {
      rule: null,
      exit: 0,
      note: '5箇所すべてでIDが一致している。'
    },
    spec: {
      rule: 'D-SPEC',
      severity: 'error',
      exit: 1,
      breakAfter: 0,
      at: 0,
      swap: { sel: '.st-body', html: '- [x] <b class="chg">`REQ-MEMBER-INTRO-001` 一覧responseは要約のみを返す</b>' },
      note: '仕様行が変更されたのに、この要求が参照するファイルが1つも変更されていない。'
    },
    regress: {
      rule: 'D-REGRESS',
      severity: 'error',
      exit: 1,
      breakAfter: 1,
      at: 1,
      swap: { sel: '.st-body', html: 'status: <b class="chg">tracked</b>\nkind:   requirement' },
      note: 'statusを implemented から後退させた。検出結果を消せてしまう操作そのものを検出する。'
    },
    marker: {
      rule: 'D-STATE',
      severity: 'error',
      exit: 1,
      breakAfter: 2,
      at: 3,
      swap: { sel: '.st-body', html: '<b class="gone">// @req REQ-MEMBER-INTRO-001</b>' },
      note: 'status が implemented なのに、実装側の参照がゼロになった。'
    }
  };

  /* Keep the untouched markup so reset is exact rather than reconstructed. */
  var original = [];
  for (var i = 0; i < stations.length; i++) {
    var body = stations[i].querySelector('.st-body');
    original.push(body ? body.innerHTML : null);
  }

  var current = null;

  function apply(name) {
    var s = STATES[name];
    if (!s) return;
    current = name;

    for (var i = 0; i < stations.length; i++) {
      stations[i].classList.remove('is-broken', 'is-cut');
      var body = stations[i].querySelector('.st-body');
      if (body && original[i] !== null) body.innerHTML = original[i];
    }

    if (s.rule) {
      var hit = stations[s.at];
      if (hit) {
        hit.classList.add('is-broken');
        if (s.swap) {
          var el = hit.querySelector(s.swap.sel);
          if (el) el.innerHTML = s.swap.html;
        }
      }
      /* The chain parts immediately after the station that went wrong. */
      var cut = stations[s.breakAfter];
      if (cut) cut.classList.add('is-cut');
    }

    root.classList.toggle('is-failing', !!s.rule);
    readout.innerHTML = s.rule
      ? '<span class="ro-rule">' + s.rule + '</span>'
        + '<span class="sev e">' + s.severity + '</span>'
        + '<span class="ro-exit">exit 1</span>'
        + '<span class="ro-note">' + s.note + '</span>'
      : '<span class="ro-rule ok">req:check</span>'
        + '<span class="sev ok">pass</span>'
        + '<span class="ro-exit">exit 0</span>'
        + '<span class="ro-note">' + s.note + '</span>';

    for (var b = 0; b < buttons.length; b++) {
      buttons[b].setAttribute('aria-pressed', buttons[b].dataset.break === name ? 'true' : 'false');
    }
    if (resetBtn) resetBtn.disabled = (name === 'ok');
  }

  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener('click', function (ev) {
      var name = ev.currentTarget.dataset.break;
      apply(current === name ? 'ok' : name);
    });
  }
  if (resetBtn) resetBtn.addEventListener('click', function () { apply('ok'); });

  apply('ok');

  /* Draw the chain through once, when it is first looked at.
   *
   * The chain is connected in CSS by default, because that is the true state.
   * Arming is what collapses it so it can be drawn, and we only arm when we
   * are actually going to animate — reduced motion and browsers without the
   * observer simply keep the connected chain they already have. */
  if (!reduceMotion && window.IntersectionObserver) {
    root.classList.add('is-armed');
    var io = new window.IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        root.classList.add('is-live');
        io.disconnect();
        window.clearTimeout(guard);
      }
    }, { threshold: 0.25 });
    io.observe(root);

    /* Armed but never drawn would leave the chain looking severed. If the
     * observer has not fired by now, draw it anyway. */
    var guard = window.setTimeout(function () {
      root.classList.add('is-live');
      io.disconnect();
    }, 4000);
  }
})();
