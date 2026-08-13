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
})();
