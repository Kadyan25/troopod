/**
 * Purelane Combos rail: reveal-on-scroll init + "Shop bundle" multi-item
 * add-to-cart. Adds every product in the combo to the real Shopify cart in
 * one request (Cart AJAX API, since the classic /cart/add form only takes
 * one variant per submit) and sends the customer to their cart to review it.
 *
 * Deliberately does NOT try to fake the combo's flat promotional price in
 * the cart — that needs a real discount mechanism (Shopify Function or
 * bundles app), out of scope for a stock-Dawn build. See build notes.
 */
(function () {
  'use strict';

  function initCombos(root) {
    if (window.PurelaneReveal) window.PurelaneReveal.init(root);

    root.querySelectorAll('.purelane-combo-add').forEach(function (button) {
      if (button.dataset.purelaneBound) return;
      button.dataset.purelaneBound = 'true';
      button.addEventListener('click', function () {
        var ids = (button.dataset.variantIds || '')
          .split(',')
          .map(function (id) {
            return id.trim();
          })
          .filter(Boolean);
        if (!ids.length) return;

        button.setAttribute('data-loading', '');
        button.setAttribute('aria-busy', 'true');

        fetch(window.routes.cart_add_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: ids.map(function (id) {
              return { id: id, quantity: 1 };
            }),
          }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('cart add failed');
            return res.json();
          })
          .then(function () {
            window.location = window.routes.cart_url;
          })
          .catch(function () {
            button.removeAttribute('data-loading');
            button.removeAttribute('aria-busy');
          });
      });
    });
  }

  function destroyCombos(root) {
    if (window.PurelaneReveal) window.PurelaneReveal.destroy(root);
  }

  document.querySelectorAll('[data-purelane-combos]').forEach(initCombos);

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-purelane-combos]');
    if (root) initCombos(root);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.querySelector('[data-purelane-combos]');
    if (root) destroyCombos(root);
  });
})();
