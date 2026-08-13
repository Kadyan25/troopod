/**
 * Shared reveal-on-scroll for purelane-* sections.
 * Each section calls PurelaneReveal.init(root) on its own root element when
 * it loads (initial parse + shopify:section:load) and PurelaneReveal.destroy(root)
 * on shopify:section:unload, so nothing leaks and nothing double-fires when a
 * merchant adds a second instance of the same section.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var observers = new WeakMap();

  function init(root) {
    if (!root || observers.has(root)) return;
    var targets = root.querySelectorAll('.purelane-rv');
    if (!targets.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) {
        el.classList.add('purelane-in');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('purelane-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
    observers.set(root, io);
  }

  function destroy(root) {
    var io = observers.get(root);
    if (io) {
      io.disconnect();
      observers.delete(root);
    }
  }

  window.PurelaneReveal = { init: init, destroy: destroy, reducedMotion: reduce };

  /**
   * Auto-wiring for sections that need nothing but reveal-on-scroll: mark
   * the section root with [data-purelane-reveal] and this handles init on
   * first paint + shopify:section:load, and teardown on
   * shopify:section:unload — no per-section boilerplate script needed.
   * Sections with extra behavior (hero, combos, ...) call init/destroy
   * themselves instead and don't need this attribute.
   */
  function autoInit() {
    document.querySelectorAll('[data-purelane-reveal]').forEach(init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-purelane-reveal]');
    if (root) init(root);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.querySelector('[data-purelane-reveal]');
    if (root) destroy(root);
  });
})();
