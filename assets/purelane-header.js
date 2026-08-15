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

  // The scenes stage lives in the layout, not in this section, so look it up
  // on the document rather than inside the section root.
  function initScenes() {
    var stage = document.querySelector('[data-purelane-scenes]');
    if (!stage) return null;
    var scenes = [].slice.call(stage.querySelectorAll('.purelane-scene'));
    var layers = [].slice.call(stage.querySelectorAll('.purelane-wl'));
    var zones = [].slice.call(document.querySelectorAll('[data-scene]'));
    var depths = [0.05, 0.09, 0.03, 0.02];
    var current = 1;
    var raf = null;
    var mx = 0;
    var my = 0;

    function setScene(n) {
      if (n === current) return;
      current = n;
      scenes.forEach(function (s, i) {
        s.classList.toggle('purelane-on', i + 1 === n);
      });
      // Drives the depth-based opacity of the water layers (see purelane-base.css)
      stage.setAttribute('data-d', String(n));
    }
    function pickScene() {
      var focus = window.scrollY + window.innerHeight * 0.5;
      var n = 1;
      for (var i = 0; i < zones.length; i++) {
        var top = 0;
        var el = zones[i];
        while (el) {
          top += el.offsetTop;
          el = el.offsetParent;
        }
        if (top <= focus) {
          n = parseInt(zones[i].getAttribute('data-scene'), 10) || n;
        }
      }
      setScene(n);
    }
    function frame() {
      raf = null;
      var y = window.scrollY || window.pageYOffset;
      for (var i = 0; i < layers.length; i++) {
        var d = depths[i] || 0.05;
        layers[i].style.setProperty('--px', (mx * d * 130).toFixed(1) + 'px');
        layers[i].style.setProperty('--py', (-y * d + my * d * 90).toFixed(1) + 'px');
      }
      pickScene();
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function onMouse(e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      onScroll();
    }

    if (reduce) {
      // Still place the page in the right scene, just without the motion.
      pickScene();
      return null;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Pointer parallax is desktop-only in the prototype, and pointless on touch.
    var wide = window.matchMedia('(min-width: 1024px)').matches;
    if (wide) window.addEventListener('mousemove', onMouse, { passive: true });
    frame();
    return function () {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (wide) window.removeEventListener('mousemove', onMouse);
      if (raf) cancelAnimationFrame(raf);
    };
  }

  function initHeader(root) {
    if (!root || instances.has(root)) return;
    var header = root.querySelector('[data-purelane-header]');
    var burger = root.querySelector('[data-purelane-burger]');
    var mobileNav = root.querySelector('[data-purelane-nav-mobile]');
    var cleanup = [];

    var stopScenes = initScenes();
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
