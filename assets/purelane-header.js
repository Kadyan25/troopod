/**
 * Purelane header: scroll-driven "up" state (matches prototype's header
 * lift on scroll) + a real, working mobile menu toggle for the burger
 * button (the prototype's burger had no behavior wired up — porting it as
 * decorative-only would ship a dead control, so this makes it functional).
 */
(function () {
  'use strict';
  var instances = new WeakMap();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initScenes(root) {
    var stage = root.querySelector('[data-purelane-scenes]');
    if (!stage) return null;
    var scenes = [].slice.call(stage.querySelectorAll('.purelane-scene'));
    var zones = [].slice.call(document.querySelectorAll('[data-scene]'));
    var current = 1;

    function setScene(n) {
      if (n === current) return;
      current = n;
      scenes.forEach(function (s, i) {
        s.classList.toggle('purelane-on', i + 1 === n);
      });
    }
    function pickScene() {
      var focus = window.scrollY + window.innerHeight * 0.5;
      var n = 1;
      for (var i = 0; i < zones.length; i++) {
        if (zones[i].offsetTop <= focus) {
          n = parseInt(zones[i].getAttribute('data-scene'), 10) || n;
        }
      }
      setScene(n);
    }
    if (reduce) return null;
    window.addEventListener('scroll', pickScene, { passive: true });
    window.addEventListener('resize', pickScene, { passive: true });
    pickScene();
    return function () {
      window.removeEventListener('scroll', pickScene);
      window.removeEventListener('resize', pickScene);
    };
  }

  function initHeader(root) {
    if (!root || instances.has(root)) return;
    var header = root.querySelector('[data-purelane-header]');
    var burger = root.querySelector('[data-purelane-burger]');
    var mobileNav = root.querySelector('[data-purelane-nav-mobile]');
    var cleanup = [];

    var stopScenes = initScenes(root);
    if (stopScenes) cleanup.push(stopScenes);

    if (header) {
      var onScroll = function () {
        header.classList.toggle('purelane-up', window.scrollY > 90);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      cleanup.push(function () {
        window.removeEventListener('scroll', onScroll);
      });
    }

    if (burger && mobileNav) {
      var toggle = function () {
        var open = mobileNav.classList.toggle('purelane-open');
        mobileNav.hidden = !open;
        burger.setAttribute('aria-expanded', String(open));
      };
      burger.addEventListener('click', toggle);
      cleanup.push(function () {
        burger.removeEventListener('click', toggle);
      });
    }

    instances.set(root, cleanup);
  }

  function destroyHeader(root) {
    var cleanup = instances.get(root);
    if (cleanup) {
      cleanup.forEach(function (fn) {
        fn();
      });
      instances.delete(root);
    }
  }

  document.querySelectorAll('.purelane-scope').forEach(function (root) {
    if (root.querySelector('[data-purelane-header]')) initHeader(root);
  });

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('.purelane-scope');
    if (root && root.querySelector('[data-purelane-header]')) initHeader(root);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.querySelector('.purelane-scope');
    if (root) destroyHeader(root);
  });
})();
