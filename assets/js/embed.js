/* Puts a live diagram into the page, on screens wide enough to read it.
 *
 * The diagrams are self-contained pages of roughly 700KB each. Embedding one
 * is the strongest thing this site can do — it is generated from the ADRs and
 * verified, and that only lands if you can touch it. But measured at 375px
 * the graph is cut off at the right edge with two nodes visible, which reads
 * as broken rather than impressive, so narrow screens keep the link instead.
 *
 * The iframe is injected rather than written into the markup: a hidden iframe
 * is still fetched, and a phone should not spend 700KB on something it will
 * not be shown. Without script the link is what remains, which is correct.
 */
(function () {
  'use strict';

  var slot = document.getElementById('diagram-embed');
  if (!slot) return;

  var MIN_WIDTH = 900;
  /* The diagram is a page of its own, so a fixed frame height leaves it with
   * an inner scrollbar — a scroll region inside a scrolling page, which is
   * exactly the thing that makes an embed feel boxed in. It is same-origin,
   * so the frame is sized to what the diagram actually needs instead. */
  var MIN_HEIGHT = 420;
  var MAX_HEIGHT = 1600;
  var loaded = false;
  var frame = null;

  function fits() {
    return window.innerWidth >= MIN_WIDTH;
  }

  /* The diagram's own layout uses the viewport height, so changing the frame
   * height can change what it reports. The clamp keeps a runaway page from
   * taking over the section; the deadband stops us rewriting the style for
   * sub-pixel churn. */
  function fit() {
    if (!frame) return;
    var doc;
    try { doc = frame.contentDocument; } catch (err) { return; }
    if (!doc || !doc.documentElement) return;

    /* scrollHeight and clientHeight are integers. The real content here is
     * 777.359px tall, so both round to 777, `scrollHeight > clientHeight` is
     * false, and a frame set to 777 still overflows by a third of a pixel —
     * which the browser renders as a scrollbar. Measure the fractional height
     * and round up, then add a pixel so nothing is left over. */
    var de = doc.documentElement;
    var body = doc.body;
    var want = de.scrollHeight;
    if (body) {
      want = Math.max(want, Math.ceil(body.getBoundingClientRect().height), body.scrollHeight);
    }
    if (!want) return;
    want = Math.min(Math.max(want + 1, MIN_HEIGHT), MAX_HEIGHT);

    var have = frame.getBoundingClientRect().height;
    if (Math.abs(want - have) <= 1) return;
    frame.style.height = want + 'px';
  }

  /* Watching elements does not work here. The body carries min-height:100vh so
   * it stays exactly as tall as the frame, and the diagram's own container is
   * height-constrained — content grows straight past both without either box
   * changing, which is precisely the case that leaves a scrollbar behind. What
   * actually moves is documentElement.scrollHeight, so that is what we read.
   *
   * The diagram draws itself after its scripts run, so this polls while that
   * settles and then stops. It is a handful of reads over a few seconds, not a
   * permanent loop. */
  /* One-way in practice: once the frame is tall, the inner body fills it
   * (min-height:100vh), so scrollHeight can never report less than the frame
   * and the height does not come back down within a session. Left as is —
   * some extra space below the diagram is a far better outcome than the
   * scrollbar this exists to remove, and a reload starts from the real
   * measurement again. */
  var polling = 0;

  function poll(times, every) {
    window.clearInterval(polling);
    var left = times;
    fit();
    polling = window.setInterval(function () {
      fit();
      if (--left <= 0) window.clearInterval(polling);
    }, every);
  }

  /* The frame is sized to the diagram, so nothing needs to scroll — but the
   * browser still reserves and paints a scrollbar, 15px of it, which reads as
   * a stray white bar down the right edge of the embed.
   *
   * The diagram is same-origin, so the bar can be taken out of the embedded
   * rendering. This changes nothing on disk: docs/diagrams/*.html is pinned by
   * sha256 and is not touched. It is a style injected into this one framed
   * view, and the page keeps working exactly as before when opened directly.
   *
   * Scrolling itself is deliberately left possible. If the height is ever a
   * little short, a wheel still reaches the rest; only the bar is gone. */
  function hideScrollbar() {
    var doc;
    try { doc = frame.contentDocument; } catch (err) { return; }
    if (!doc || !doc.head || doc.getElementById('embed-no-scrollbar')) return;
    var style = doc.createElement('style');
    style.id = 'embed-no-scrollbar';
    style.textContent =
      'html{scrollbar-width:none;-ms-overflow-style:none;}' +
      'html::-webkit-scrollbar{width:0;height:0;display:none;}';
    doc.head.appendChild(style);
  }

  function settle() { poll(25, 400); }

  /* Opening a panel or switching the diagram's theme changes its height with
   * no resize involved, so watch for a hand on it and re-measure after. */
  function nudge() { poll(6, 300); }

  function mount() {
    if (loaded || !fits()) return;
    loaded = true;

    frame = document.createElement('iframe');
    frame.src = slot.dataset.src;
    frame.title = slot.dataset.title;
    frame.loading = 'lazy';
    frame.className = 'diagram-frame';
    frame.addEventListener('load', function () {
      hideScrollbar();
      settle();
      try {
        var d = frame.contentDocument;
        d.addEventListener('click', nudge, true);
        d.addEventListener('keydown', nudge, true);
        d.addEventListener('wheel', nudge, { capture: true, passive: true });
      } catch (err) { /* nothing to attach to */ }
    });
    slot.appendChild(frame);
    slot.classList.add('is-mounted');
  }

  mount();

  /* A window widened past the threshold gets the diagram; one narrowed below
   * it keeps what it already has, because tearing a loaded diagram out from
   * under someone is worse than leaving it. */
  var t = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(t);
    /* A narrower frame rewraps the diagram, so the height it needs changes. */
    t = window.setTimeout(function () { mount(); settle(); }, 250);
  }, { passive: true });
})();
