/**
 * Purelane Hero: product-stage slide cycling (1/2/3-product slides + price
 * tag), scroll-driven float/fade on the product stage, editor-safe init.
 * Ported behavior from purelane-homepage.html's hstage + prod parallax logic.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var instances = new WeakMap();

  function initHero(root) {
    if (!root || instances.has(root)) return;
    if (window.PurelaneReveal) window.PurelaneReveal.init(root);

    var stage = root.querySelector('[data-purelane-hstage]');
    var prod = root.querySelector('.purelane-hero-prod');
    var state = { stage: stage, prod: prod, cleanup: [] };

    if (stage) {
      var slides = [].slice.call(stage.querySelectorAll('.purelane-hslide'));
      var dots = [].slice.call(root.querySelectorAll('.purelane-hdots button'));
      var i = 0;
      var timer = null;

      function go(n) {
        i = (n + slides.length) % slides.length;
        slides.forEach(function (s, idx) {
          s.classList.toggle('purelane-on', idx === i);
        });
        dots.forEach(function (d, idx) {
          d.classList.toggle('purelane-on', idx === i);
        });
      }
      function play() {
        if (!timer && !reduce && slides.length > 1) {
          timer = setInterval(function () {
            go(i + 1);
          }, 3800);
        }
      }
      function stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      dots.forEach(function (d, idx) {
        var handler = function () {
          stop();
          go(idx);
          play();
        };
        d.addEventListener('click', handler);
        state.cleanup.push(function () {
          d.removeEventListener('click', handler);
        });
      });

      stage.addEventListener('mouseenter', stop);
      stage.addEventListener('mouseleave', play);
      state.cleanup.push(function () {
        stage.removeEventListener('mouseenter', stop);
        stage.removeEventListener('mouseleave', play);
      });

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              e.isIntersecting ? play() : stop();
            });
          },
          { threshold: 0.2 }
        );
        io.observe(stage);
        state.cleanup.push(function () {
          io.disconnect();
          stop();
        });
      } else {
        play();
        state.cleanup.push(stop);
      }
    }

    if (prod && !reduce) {
      var raf = null;
      var mx = 0;
      var my = 0;
      function frame() {
        raf = null;
        var y = window.scrollY || window.pageYOffset;
        var f = Math.min(y / 700, 1);
        prod.style.transform =
          'translate3d(' + (mx * -16).toFixed(2) + 'px,' + (-f * 54 + my * -10).toFixed(2) + 'px,0) scale(' + (1 - f * 0.06).toFixed(3) + ')';
        prod.style.opacity = (1 - f * 0.55).toFixed(3);
      }
      function onScroll() {
        if (!raf) raf = requestAnimationFrame(frame);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      state.cleanup.push(function () {
        window.removeEventListener('scroll', onScroll);
        if (raf) cancelAnimationFrame(raf);
      });

      if (window.matchMedia('(min-width: 1024px)').matches) {
        var onMove = function (e) {
          mx = (e.clientX / window.innerWidth - 0.5) * 2;
          my = (e.clientY / window.innerHeight - 0.5) * 2;
          onScroll();
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        state.cleanup.push(function () {
          window.removeEventListener('mousemove', onMove);
        });
      }
      frame();
    }

    instances.set(root, state);
  }

  function destroyHero(root) {
    var state = instances.get(root);
    if (!state) return;
    state.cleanup.forEach(function (fn) {
      fn();
    });
    if (window.PurelaneReveal) window.PurelaneReveal.destroy(root);
    instances.delete(root);
  }

  document.querySelectorAll('[data-purelane-hero]').forEach(initHero);

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-purelane-hero]');
    if (root) initHero(root);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.querySelector('[data-purelane-hero]');
    if (root) destroyHero(root);
  });

  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest('[data-purelane-hstage]');
    if (!root) return;
    var index = [].slice.call(root.querySelectorAll('.purelane-hslide')).indexOf(event.target);
    if (index === -1) return;
    root.querySelectorAll('.purelane-hslide').forEach(function (s, i) {
      s.classList.toggle('purelane-on', i === index);
    });
    var section = root.closest('[data-purelane-hero]');
    if (section) {
      section.querySelectorAll('.purelane-hdots button').forEach(function (d, i) {
        d.classList.toggle('purelane-on', i === index);
      });
    }
  });
})();
