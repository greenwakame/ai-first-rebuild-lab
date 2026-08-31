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
  var loaded = false;

  function fits() {
    return window.innerWidth >= MIN_WIDTH;
  }

  function mount() {
    if (loaded || !fits()) return;
    loaded = true;

    var frame = document.createElement('iframe');
    frame.src = slot.dataset.src;
    frame.title = slot.dataset.title;
    frame.loading = 'lazy';
    frame.className = 'diagram-frame';
    slot.appendChild(frame);
    slot.classList.add('is-mounted');
  }

  mount();

  /* A window widened past the threshold gets the diagram; one narrowed below
   * it keeps what it already has, because tearing a loaded diagram out from
   * under someone is worse than leaving it. */
  if (!loaded) {
    var t = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(mount, 250);
    }, { passive: true });
  }
})();
