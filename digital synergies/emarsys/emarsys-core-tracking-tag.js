// @ts-nocheck
/**
 * SAP Emarsys Web Extend — Single GTM Custom HTML Tag
 * Client: schiesser.com  |  Merchant ID: 1D08E42FA9E10011
 *
 * GTM Triggers (all pointing to this single tag):
 *   1. All Pages
 *   2. Custom Event            view_item
 *   3. Custom Event            view_cart
 *   4. Custom Event            purchase
 *
 * GTM Blocking Trigger (add to ALL Emarsys tag triggers):
 *   "No Consent - Emarsys" — fires when neither Emarsys-COM nor Emarsys-CH
 *   consent is granted. Prevents any tracking without user consent.
 *
 * GTM Variables required:
 *   {{Event}}                          Built-in   — current event name
 *   {{DLV - page.type}}                DL Var     — page.type
 *   {{DLV - page.name}}                DL Var     — page.name
 *   {{DLV - ecommerce.items}}          DL Var     — ecommerce.items
 *   {{DLV - ecommerce.transaction_id}} DL Var     — ecommerce.transaction_id
 *   {{CJS - Page Category}}            CJS Var    — category label derived from page.name
 *
 * Product ID format: "{article-number}-{color-code}"  e.g. "183214-926"
 * Currency: EUR
 */

(function () {
  // Script loader
  window.ScarabQueue = window.ScarabQueue || [];
  if (!document.getElementById('scarab-js-api')) {
    var js = document.createElement('script');
    js.id    = 'scarab-js-api';
    js.async = true;
    js.src   = '//cdn.scarabresearch.com/js/1D08E42FA9E10011/scarab-v2.js';
    document.head.appendChild(js);
  }

  // customer identity
  var email = getEmail();
  if (email && window.__emarsysEmailSent !== email) {
    window.__emarsysEmailSent = email;
    ScarabQueue.push(['setEmail', email]);
  }

  // view_item event
  if ('{{Event}}' === 'view_item') {
    var items = {{DLV - ecommerce.items}};
    if (items && items[0] && items[0].item_id) {
      ScarabQueue.push(['view', items[0].item_id]);
    }
    var category = {{CJS - Page Category}};
    if (category) {
      ScarabQueue.push(['category', category]);
    }
    ScarabQueue.push(['go']);
    return;
  }

  // view_cart event
  if ('{{Event}}' === 'view_cart') {
    var items = {{DLV - ecommerce.items}};
    ScarabQueue.push(['cart', toCartItems(items)]);
    ScarabQueue.push(['go']);
    return;
  }

  // purchase event
  if ('{{Event}}' === 'purchase') {
    var orderId = '{{DLV - ecommerce.transaction_id}}';
    var items   = {{DLV - ecommerce.items}};

    // Guard against duplicate calls on TY page reload.
    try {
      var key = 'em_purchase_' + orderId;
      if (orderId && sessionStorage.getItem(key)) { return; }
      if (orderId) { sessionStorage.setItem(key, '1'); }
    } catch (e) {}

    if (orderId && items && items.length) {
      ScarabQueue.push(['purchase', {
        orderId: orderId,
        items:   toCartItems(items)
      }]);
    }
    ScarabQueue.push(['go']);
    return;
  }

  // Exit early as handled by view_item, view_cart and purchase
  if ({{DLV - page.type}} === 'product') { return; }
  if ({{DLV - page.name}} === 'checkout:basket') { return; }
  if ({{DLV - page.name}} === 'checkout:order') { return; }

  if ({{DLV - page.type}} === 'category') {
    var category = {{CJS - Page Category}};
    if (category) {
      ScarabQueue.push(['category', category]);
    }
  }

  ScarabQueue.push(['go']);

  
  // ----- Helper functions -----

  // Gets email from dataLayer, localStorage or Cookie
  function getEmail() {
    try {
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        var o = dl[i] || {};
        if (o.user_email) return String(o.user_email).trim().toLowerCase();
        if (o.user && o.user.email) return String(o.user.email).trim().toLowerCase();
      }
    } catch (e) {}
    try { var ls = localStorage.getItem('em_e'); if (ls) return ls.trim().toLowerCase(); } catch (e) {}
    try {
      var m = document.cookie.match(/(?:^|;\s*)em_e=([^;]+)/);
      if (m) return decodeURIComponent(m[1]).trim().toLowerCase();
    } catch (e) {}
    return '';
  }

  // Maps GA4 ecommerce items to the Emarsys cart format.
  function toCartItems(items) {
    return (items || []).map(function (item) {
      return { item: item.item_id, price: item.price, quantity: item.quantity || 1 };
    });
  }
}());
