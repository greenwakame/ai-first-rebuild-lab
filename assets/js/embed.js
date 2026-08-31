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
  var MAX_HEIGHT = 1100;
  var loaded = false;
  var frame = null;

  function fits() {
    return window.innerWidth >= MIN_WIDTH;
  }

  /* The diagram's own layout uses the viewport height, so changing the frame
   * height can change what it reports. Measure again after setting it; two
   * passes settle it, and the clamp keeps a runaway page from taking over the
   * section — if it is clamped the inner scrollbar comes back, which is the
   * right outcome rather than a frame of unbounded height. */
  function fit() {
    if (!frame) return;
    var doc;
    try { doc = frame.contentDocument; } catch (err) { return; }
    if (!doc || !doc.documentElement) return;
    var want = doc.documentElement.scrollHeight;
    if (!want) return;
    frame.style.height = Math.min(Math.max(want, MIN_HEIGHT), MAX_HEIGHT) + 'px';
  }

  function settle() {
    fit();
    window.setTimeout(function () { fit(); watchInner(); }, 250);
  }

  /* The diagram is an application: opening a panel or switching its theme
   * changes how tall it is, with no window resize involved. Same-origin, so
   * watch it and keep the frame matched.
   *
   * Setting the height changes the viewport the diagram lays out against, so
   * this could chase itself. The deadband absorbs sub-pixel churn, and the
   * budget stops it outright if it ever fails to converge — a slightly wrong
   * height is a far better failure than a loop. */
  var watching = false;
  var budget = 24;

  function watchInner() {
    if (watching || !frame || !window.ResizeObserver) return;
    var doc;
    try { doc = frame.contentDocument; } catch (err) { return; }
    if (!doc || !doc.body) return;
    watching = true;

    var ro = new window.ResizeObserver(function () {
      if (budget <= 0) { ro.disconnect(); return; }
      var want = doc.documentElement.scrollHeight;
      var have = frame.getBoundingClientRect().height;
      if (Math.abs(want - have) > 4) { budget--; fit(); }
    });
    ro.observe(doc.body);
  }

  /* Interacting with the diagram is expected to change its height, so give the
   * budget back when the visitor does something in it. */
  function refillBudget() { budget = 24; }

  function mount() {
    if (loaded || !fits()) return;
    loaded = true;

    frame = document.createElement('iframe');
    frame.src = slot.dataset.src;
    frame.title = slot.dataset.title;
    frame.loading = 'lazy';
    frame.className = 'diagram-frame';
    frame.addEventListener('load', function () {
      settle();
      try {
        var d = frame.contentDocument;
        d.addEventListener('click', refillBudget, true);
        d.addEventListener('keydown', refillBudget, true);
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
