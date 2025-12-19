/* Version 1.1.0 */

const IS_PROD =
  init?.context?.document?.location?.hostname?.endsWith(".schiesser.com");
const ENVIRONMENT = IS_PROD ? "production" : "development";

/* ---------------------- Default consent ---------------------- */
let privacy = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

/* ---------------------- Initialize dataLayer ---------------------- */
window.dataLayer = window.dataLayer || [];

if (!IS_PROD) {
  const originalPush = window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push = function (...args) {
    console.group("[debug] dataLayer.push");
    console.log(...args);
    console.groupEnd();
    return originalPush(...args);
  };
}

dataLayer.push({
  event: "consent_default",
  ...privacy,
});

/* ---------------------- Handling initial consent ---------------------- */
if (
  init?.customerPrivacy?.analyticsProcessingAllowed ||
  init?.customerPrivacy?.marketingAllowed
) {
  const analytics_storage = init?.customerPrivacy?.analyticsProcessingAllowed
    ? "granted"
    : "denied";
  const ad_storage = init?.customerPrivacy?.marketingAllowed
    ? "granted"
    : "denied";

  privacy = {
    analytics_storage,
    ad_storage,
    ad_user_data: ad_storage,
    ad_personalization: ad_storage,
  };

  dataLayer.push({
    event: "consent_update",
    ...privacy,
  });
}

/* ---------------------- Handling consent changes ---------------------- */
api.customerPrivacy?.subscribe?.("visitorConsentCollected", (event) => {
  const analytics_storage = event?.customerPrivacy?.analyticsProcessingAllowed
    ? "granted"
    : "denied";
  const ad_storage = event?.customerPrivacy?.marketingAllowed
    ? "granted"
    : "denied";

  privacy = {
    analytics_storage,
    ad_storage,
    ad_user_data: ad_storage,
    ad_personalization: ad_storage,
  };

  dataLayer.push({
    event: "consent_update",
    ...privacy,
  });
});

/* ---------------------- Load GTM ---------------------- */
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src =
    "https://www.googletagmanager.com/gtm.js?id=" +
    i +
    dl +
    (IS_PROD
      ? ""
      : "&gtm_auth=QKY8WHHpfGJxmAMhJP4-Wg&gtm_preview=env-3&gtm_cookies_win=x");
  f?.parentNode?.insertBefore(j, f);
})(window, document, "script", "dataLayer", "GTM-K7Q2BTR2");

/* ---------------------- Helper functions ---------------------- */
function hasRequiredData(data, eventName) {
  let valid = true;

  if (!data || typeof data !== "object") {
    valid = false;
  }

  if (data.hasOwnProperty("productVariant")) {
    if (
      !data.productVariant?.price?.amount ||
      !data.productVariant?.price?.currencyCode
    ) {
      valid = false;
    }
  }

  if (data.hasOwnProperty("collection")) {
    const hasVariants =
      Array.isArray(data.collection?.productVariants) &&
      data.collection?.productVariants?.length > 0;

    if (!hasVariants) {
      valid = false;
    }
  }

  if (data.hasOwnProperty("cartLine")) {
    const currency = data.cartLine?.cost?.totalAmount?.currencyCode;
    const amount = data.cartLine?.cost?.totalAmount?.amount;

    if (!currency || !amount) {
      valid = false;
    }
  }

  if (data.hasOwnProperty("cart")) {
    const hasLines =
      Array.isArray(data.cart?.lines) && data.cart.lines.length > 0;
    const currency = data.cart?.cost?.totalAmount?.currencyCode;
    const amount = data.cart?.cost?.totalAmount?.amount;

    if (!hasLines || !currency || !amount) {
      valid = false;
    }
  }

  if (data.hasOwnProperty("checkout")) {
    const hasLineItems =
      Array.isArray(data.checkout?.lineItems) &&
      data.checkout.lineItems.length > 0;
    const currency = data.checkout?.totalPrice?.currencyCode;
    const amount = data.checkout?.totalPrice?.amount;

    if (!hasLineItems || !currency || !amount) {
      valid = false;
    }
  }

  if (!valid) {
    console.group("[debug] dataLayer.push - PREVENTED");
    console.log(`Event '${eventName}' has missing or invalid data`, data);
    console.groupEnd();
  }

  return valid;
}

function buildItemsFromVariant(variants, itemListName) {
  if (!variants) return [];

  return variants.map((variant, index) => {
    const product = variant?.product;

    return {
      item_id: variant?.sku || variant?.id || product?.id || "",
      item_name: product?.title || "",
      item_brand: product?.vendor || "",
      item_category: product?.type || "", // optional, empty is OK
      item_variant: variant?.title || "",
      item_list_name: itemListName,
      index,
      price: Number(variant?.price?.amount || 0),
      quantity: 1,
    };
  });
}

function buildItemFromVariant(variant, index = 0) {
  const product = variant?.product;

  return {
    item_id: variant?.sku || product?.id || "",
    item_name: product?.title || "",
    item_brand: product?.vendor || "",
    item_category: product?.productType || "",
    item_variant: variant?.title || "",
    price: Number(variant?.price?.amount || 0),
    quantity: 1,
    index,
  };
}

function buildItemsFromCart(cart) {
  if (!cart?.lines) return [];
  return cart.lines.map((line, index) => ({
    item_id: line.merchandise?.sku || line.merchandise?.product?.id || "",
    item_name: line.merchandise?.product?.title || "",
    item_brand: line.merchandise?.product?.vendor || "",
    item_category: line.merchandise?.product?.productType || "",
    item_variant: line.merchandise?.title || "",
    price: Number(line.merchandise?.price?.amount || 0),
    quantity: Number(line?.quantity || 1),
    index,
  }));
}

function buildItemsFromCheckout(checkout) {
  if (!checkout?.lineItems) return [];
  return checkout.lineItems.map((line, index) => ({
    item_id: line.variant?.sku || line.merchandise?.product?.id || "",
    item_name: line.variant?.product?.title || "",
    item_brand: line.variant?.product?.vendor || "",
    item_category: line.variant?.product?.productType || "",
    item_variant: line.variant?.title || "",
    price: Number(line.variant?.price?.amount || 0),
    quantity: Number(line.quantity || 1),
    index,
  }));
}

/* ---------------------- Page view ---------------------- */
analytics?.subscribe?.("page_viewed", (event) => {
  dataLayer.push({
    event: "page_view",
    page_location: event?.context?.document?.location?.href,
    page_title: event?.context?.document?.title,
    environment: ENVIRONMENT,
  });
});

/* ---------------------- Collection view ---------------------- */
analytics?.subscribe?.("collection_viewed", (event) => {
  if (!hasRequiredData(event?.data, "collection_viewed")) return;

  const collection = event?.data?.collection;

  dataLayer.push({
    event: "view_item_list",
    ecommerce: {
      item_list_id: collection?.id,
      item_list_name: collection?.title,
      items: [
        ...buildItemsFromVariant(
          collection?.productVariants,
          collection?.title
        ),
      ], // GA4 allows empty array if items are not available
    },
  });
});

/* ---------------------- Product clicked ---------------------- */
analytics?.subscribe?.("product_clicked", (event) => {
  if (!hasRequiredData(event?.data, "product_clicked")) return;

  const variant = event?.data?.productVariant;

  dataLayer.push({
    event: "select_item",
    ecommerce: {
      item_list_id: event?.data?.collection?.id,
      item_list_name: event?.data?.collection?.title,
      items: [buildItemFromVariant(variant)],
    },
  });
});

/* ---------------------- Product viewed ---------------------- */
analytics?.subscribe?.("product_viewed", (event) => {
  if (!hasRequiredData(event?.data, "product_viewed")) return;

  const variant = event?.data?.productVariant;

  dataLayer.push({
    event: "view_item",
    ecommerce: {
      currency: variant?.price?.currencyCode,
      value: Number(variant?.price?.amount || 0),
      items: [buildItemFromVariant(variant)],
    },
  });
});

/* ---------------------- Cart actions ---------------------- */
analytics?.subscribe?.("product_added_to_cart", (event) => {
  if (!hasRequiredData(event?.data, "product_added_to_cart")) return;

  const cartLine = event?.data?.cartLine;

  dataLayer.push({
    event: "add_to_cart",
    ecommerce: {
      currency: cartLine?.merchandise?.price?.currencyCode,
      value: Number(cartLine?.cost?.totalAmount?.amount || 0),
      items: [
        {
          item_id: cartLine?.merchandise?.sku || "",
          item_name: cartLine?.merchandise?.product?.title || "",
          item_brand: cartLine?.merchandise?.product?.vendor || "",
          item_category: cartLine?.merchandise?.product?.productType || "",
          item_variant: cartLine?.merchandise?.title || "",
          price: Number(cartLine?.merchandise?.price?.amount || 0),
          quantity: Number(cartLine?.quantity || 1),
        },
      ],
    },
  });
});

analytics?.subscribe?.("product_removed_from_cart", (event) => {
  if (!hasRequiredData(event?.data, "product_removed_from_cart")) return;

  const cartLine = event?.data?.cartLine;

  dataLayer.push({
    event: "remove_from_cart",
    ecommerce: {
      currency: cartLine?.merchandise?.price?.currencyCode,
      value: Number(cartLine?.cost?.totalAmount?.amount || 0),
      items: [
        {
          item_id: cartLine?.merchandise?.sku || "",
          item_name: cartLine?.merchandise?.product?.title || "",
          item_brand: cartLine?.merchandise?.product?.vendor || "",
          item_category: cartLine?.merchandise?.product?.productType || "",
          item_variant: cartLine?.merchandise?.title || "",
          price: Number(cartLine?.merchandise?.price?.amount || 0),
          quantity: Number(cartLine?.quantity || 1),
        },
      ],
    },
  });
});

analytics?.subscribe?.("cart_viewed", (event) => {
  if (!hasRequiredData(event?.data, "cart_viewed")) return;

  const cart = event?.data?.cart;

  dataLayer.push({
    event: "view_cart",
    ecommerce: {
      currency: cart?.cost?.totalAmount?.currencyCode,
      value: Number(cart?.cost?.totalAmount?.amount || 0),
      items: buildItemsFromCart(cart),
    },
  });
});

/* ---------------------- Checkout ---------------------- */
analytics?.subscribe?.("checkout_started", (event) => {
  if (!hasRequiredData(event?.data, "checkout_started")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "begin_checkout",
    ecommerce: {
      currency: checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      coupon: checkout?.discountApplications?.[0]?.code,
      items: buildItemsFromCheckout(checkout),
    },
  });
});

analytics?.subscribe?.("checkout_address_info_submitted", (event) => {
  if (!hasRequiredData(event?.data, "checkout_address_info_submitted")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "add_shipping_info",
    ecommerce: {
      currency: checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      shipping_tier: checkout?.shippingLine?.title,
      items: buildItemsFromCheckout(checkout),
    },
  });
});

analytics?.subscribe?.("payment_info_submitted", (event) => {
  if (!hasRequiredData(event?.data, "payment_info_submitted")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "add_payment_info",
    ecommerce: {
      currency: checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      payment_type: checkout?.paymentMethod,
      items: buildItemsFromCheckout(checkout),
    },
  });
});

analytics?.subscribe?.("checkout_completed", (event) => {
  if (!hasRequiredData(event?.data, "checkout_completed")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "purchase",
    ecommerce: {
      transaction_id: checkout?.order?.id || checkout?.token,
      affiliation: "Shopify Store",
      currency: checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      tax: Number(checkout?.totalTax?.amount || 0),
      shipping: Number(checkout?.shippingLine?.price?.amount || 0),
      coupon: checkout?.discountApplications?.[0]?.code,
      items: buildItemsFromCheckout(checkout),
    },
  });
});

/* ---------------------- Search ---------------------- */
analytics?.subscribe?.("search_submitted", (event) => {
  dataLayer.push({
    event: "search",
    search_term: event?.data?.searchResult?.query || "",
  });
});

/* ---------------------- Custom alerts ---------------------- */
analytics?.subscribe?.("alert_displayed", (event) => {
  dataLayer.push({
    event: "alert_displayed",
    alert_message: event?.data?.alert?.message,
    alert_target: event?.data?.alert?.target,
    alert_type: event?.data?.alert?.type,
    alert_value: event?.data?.alert?.value,
  });
});

/* ---------------------- Custom errors ---------------------- */
analytics?.subscribe?.("ui_extension_errored", (event) => {
  dataLayer.push({
    event: "ui_extension_errored",
    error_app_id: event?.data?.error?.appId,
    error_app_name: event?.data?.error?.appName,
    error_app_version: event?.data?.error?.appVersion,
    error_extension_name: event?.data?.error?.extensionName,
    error_extension_target: event?.data?.error?.extensionTarget,
    error_message: event?.data?.error?.message,
    error_type: event?.data?.error?.type,
  });
});
