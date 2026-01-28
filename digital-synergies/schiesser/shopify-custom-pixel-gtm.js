/**
 * Version 1.1.6
 *
 * © 2026 datapip.de - Philipp Jaeckle – Custom implementation.
 *
 * This implementation contains proprietary logic.
 * Third-party snippets (e.g. Google Tag Manager, Shopify APIs)
 * remain the property of their respective owners.
 */

/* ---------------------- Variables ---------------------- */
const isProd = ["www.schiesser.com", "www.schiesser.ch"].includes(
  init?.context?.document?.location?.hostname,
);
const env = isProd ? "production" : "development";
const defaultShopLanguage = "de";

const __userEmail = (init?.data?.customer?.email || "").toLowerCase() || null;
const __userPhone = init?.data?.customer?.phone || null;
const userId = (init?.data?.customer?.id || "").toLowerCase() || null;
const userOrdersCount = init?.data?.customer?.ordersCount || null;

const shopCountry = (init?.data?.shop?.countryCode || "").toLowerCase() || null;
const shopLanguage = getLanguageFromPathname(
  init?.context?.document?.location?.pathname,
);
const pageType = getTypeFromPathname(
  init?.context?.document?.location?.pathname,
);

let userEmailHash = null;
let userPhoneHash = null;
let privacy = {
  consent_analytics: false,
  consent_marketing: false,
};

/* ---------------------- Hash user data ---------------------- */
(async () => {
  userEmailHash = __userEmail ? await sha256(__userEmail) : null;
  userPhoneHash = __userPhone ? await sha256(__userPhone) : null;
})();

/* ---------------------- Initialize dataLayer ---------------------- */
window.dataLayer = window.dataLayer || [];

if (!isProd) {
  const originalPush = window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push = function (...args) {
    console.groupCollapsed(
      "[debug] dataLayer.push - event:",
      args[0]?.event || "unknown",
    );
    console.log(...args);
    console.groupEnd();
    return originalPush(...args);
  };

  console.log("[debug] init - event", init);
}

window.dataLayer.push([
  "consent",
  "default",
  {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  },
]);

window.dataLayer.push({
  event: "consent_default",
  consent_analytics: privacy.consent_analytics,
  consent_marketing: privacy.consent_marketing,
});

/* ---------------------- Handling initial consent ---------------------- */
if (
  init?.customerPrivacy?.analyticsProcessingAllowed ||
  init?.customerPrivacy?.marketingAllowed
) {
  privacy = {
    consent_analytics: init?.customerPrivacy?.analyticsProcessingAllowed,
    consent_marketing: init?.customerPrivacy?.marketingAllowed,
  };

  window.dataLayer.push([
    "consent",
    "update",
    {
      analytics_storage: privacy.consent_analytics ? "granted" : "denied",
      ad_storage: privacy.consent_marketing ? "granted" : "denied",
      ad_user_data: privacy.consent_marketing ? "granted" : "denied",
      ad_personalization: privacy.consent_marketing ? "granted" : "denied",
    },
  ]);

  window.dataLayer.push({
    event: "consent_update",
    consent_analytics: privacy.consent_analytics,
    consent_marketing: privacy.consent_marketing,
  });
}

/* ---------------------- Handling consent changes ---------------------- */
api.customerPrivacy?.subscribe?.("visitorConsentCollected", (event) => {
  privacy = {
    consent_analytics: event?.customerPrivacy?.analyticsProcessingAllowed,
    consent_marketing: event?.customerPrivacy?.marketingAllowed,
  };

  window.dataLayer.push([
    "consent",
    "update",
    {
      analytics_storage: privacy.consent_analytics ? "granted" : "denied",
      ad_storage: privacy.consent_marketing ? "granted" : "denied",
      ad_user_data: privacy.consent_marketing ? "granted" : "denied",
      ad_personalization: privacy.consent_marketing ? "granted" : "denied",
    },
  ]);

  window.dataLayer.push({
    event: "consent_update",
    consent_analytics: privacy.consent_analytics,
    consent_marketing: privacy.consent_marketing,
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
    (isProd
      ? ""
      : "&gtm_auth=QKY8WHHpfGJxmAMhJP4-Wg&gtm_preview=env-3&gtm_cookies_win=x");
  f?.parentNode?.insertBefore(j, f);
})(window, document, "script", "dataLayer", "GTM-K7Q2BTR2");

/* ---------------------- Validation functions ---------------------- */
function isValidEcommerce(event, ecommerce) {
  if (!event || !ecommerce) {
    pushError(event, "missing event or ecommerce payload");
    return false;
  }

  if (event === "view_item_list") {
    if (!ecommerce.items?.length || !hasValidItem(ecommerce.items)) {
      pushError(event, "missing required ecommerce data");
      return false;
    }
  }

  if (
    [
      "view_item",
      "add_to_cart",
      "remove_from_cart",
      "view_cart",
      "begin_checkout",
      "add_shipping_info",
      "add_payment_info",
    ].includes(event)
  ) {
    if (
      !ecommerce.currency ||
      ecommerce.value == null ||
      !ecommerce.items?.length ||
      !hasValidItem(ecommerce.items)
    ) {
      pushError(event, "missing required ecommerce data");
      return false;
    }
  }

  if (event === "purchase") {
    if (
      !ecommerce.currency ||
      ecommerce.value == null ||
      !ecommerce.transaction_id ||
      !ecommerce.items?.length ||
      !hasValidItem(ecommerce.items)
    ) {
      pushError(event, "missing required ecommerce data");
      return false;
    }
  }

  return true;
}

function hasValidItem(items) {
  if (!items) return false;

  return items?.some(
    (item) =>
      (typeof item.item_id === "string" && item.item_id.trim()) ||
      (typeof item.item_name === "string" && item.item_name.trim()),
  );
}

function pushError(event, message) {
  console.error("[error]", message);
  dataLayer.push({
    event: "datalayer_error",
    error_event: event,
    error_message: message,
  });
}

/* ---------------------- Page view ---------------------- */
analytics?.subscribe?.("page_viewed", (event) => {
  dataLayer.push({
    event: "page_view",
    page_location: event?.context?.document?.location?.href,
    page_title: event?.context?.document?.title,
    page_type: pageType,
    shop_country: shopCountry,
    shop_language: shopLanguage,
    env: env,
    user_id: userId,
    user_orders_count: userOrdersCount,
    user_email_hash: userEmailHash,
    user_phone_hash: userPhoneHash,
    // __user_email: __userEmail,
    // __user_phone: __userPhone,
  });
});

/* ---------------------- Collection view ---------------------- */
analytics?.subscribe?.("collection_viewed", (event) => {
  const ga4_event_name = "view_item_list";

  const collection = event?.data?.collection;

  if (!collection) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    // currency: "",
    item_list_id: collection?.id,
    item_list_name: collection?.title,
    items: collection.productVariants
      ? collection.productVariants.map((variant, index) => ({
          item_id: variant?.sku || variant?.product?.id || "",
          item_name: variant?.product?.title || "",
          affiliation: "",
          coupon: "",
          discount: "",
          index,
          item_brand: variant?.product?.vendor || "",
          item_category: variant?.product?.type || "",
          item_category2: "",
          item_category3: "",
          item_category4: "",
          item_category5: "",
          item_list_id: collection?.id,
          item_list_name: collection?.title,
          item_variant: variant?.title || "",
          location_id: "",
          price: Number(variant?.price?.amount || 0),
          quantity: 1,
        }))
      : [],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

/* ---------------------- Product viewed ---------------------- */
analytics?.subscribe?.("product_viewed", (event) => {
  const ga4_event_name = "view_item";

  const variant = event?.data?.productVariant;

  if (!variant) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: variant?.price?.currencyCode,
    value: Number(variant?.price?.amount || 0),
    items: [
      {
        item_id: variant.product?.id || "",
        item_name: variant.product?.title || "",
        affiliation: "",
        coupon: "",
        discount: "",
        index: 0,
        item_brand: variant.product?.vendor || "",
        item_category: variant.product?.type || "",
        item_category2: "",
        item_category3: "",
        item_category4: "",
        item_category5: "",
        item_list_id: "",
        item_list_name: "",
        item_variant: variant?.title || "",
        location_id: "",
        price: Number(variant?.price?.amount || 0),
        quantity: 1,
      },
    ],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

/* ---------------------- Cart actions ---------------------- */
analytics?.subscribe?.("product_added_to_cart", (event) => {
  const ga4_event_name = "add_to_cart";

  const cartLine = event?.data?.cartLine;

  if (!cartLine) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: cartLine?.merchandise?.price?.currencyCode,
    value: Number(cartLine?.cost?.totalAmount?.amount || 0),
    items: [
      {
        item_id: cartLine?.merchandise?.product?.id || "",
        item_name: cartLine?.merchandise?.product?.title || "",
        affiliation: "",
        coupon: "",
        discount: "",
        index: 0,
        item_brand: cartLine?.merchandise?.product?.vendor || "",
        item_category: cartLine?.merchandise?.product?.type || "",
        item_category2: "",
        item_category3: "",
        item_category4: "",
        item_category5: "",
        item_list_id: "",
        item_list_name: "",
        item_variant: cartLine?.merchandise?.title || "",
        location_id: "",
        price: Number(cartLine?.merchandise?.price?.amount || 0),
        quantity: Number(cartLine?.quantity || 1),
      },
    ],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

analytics?.subscribe?.("product_removed_from_cart", (event) => {
  const ga4_event_name = "remove_from_cart";

  const cartLine = event?.data?.cartLine;

  if (!cartLine) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: cartLine?.merchandise?.price?.currencyCode,
    value: Number(cartLine?.cost?.totalAmount?.amount || 0),
    items: [
      {
        item_id: cartLine?.merchandise?.product?.id || "",
        item_name: cartLine?.merchandise?.product?.title || "",
        affiliation: "",
        coupon: "",
        discount: "",
        index: 0,
        item_brand: cartLine?.merchandise?.product?.vendor || "",
        item_category: cartLine?.merchandise?.product?.type || "",
        item_category2: "",
        item_category3: "",
        item_category4: "",
        item_category5: "",
        item_list_id: "",
        item_list_name: "",
        item_variant: cartLine?.merchandise?.title || "",
        location_id: "",
        price: Number(cartLine?.merchandise?.price?.amount || 0),
        quantity: Number(cartLine?.quantity || 1),
      },
    ],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

analytics?.subscribe?.("cart_viewed", (event) => {
  const ga4_event_name = "view_cart";

  const cart = event?.data?.cart;

  if (!cart) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: cart?.cost?.totalAmount?.currencyCode,
    value: Number(cart?.cost?.totalAmount?.amount || 0),
    items: cart.lines
      ? cart.lines.map((line, index) => ({
          item_id: line.merchandise?.product?.id || "",
          item_name: line.merchandise?.product?.title || "",
          affiliation: "",
          coupon: "",
          discount: "",
          index,
          item_brand: line.merchandise?.product?.vendor || "",
          item_category: line.merchandise?.product?.type || "",
          item_category2: "",
          item_category3: "",
          item_category4: "",
          item_category5: "",
          item_list_id: "",
          item_list_name: "",
          item_variant: line.merchandise?.title || "",
          location_id: "",
          price: Number(line.merchandise?.price?.amount || 0),
          quantity: Number(line?.quantity || 1),
        }))
      : [],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

/* ---------------------- Checkout ---------------------- */
analytics?.subscribe?.("checkout_started", (event) => {
  const ga4_event_name = "begin_checkout";

  const checkout = event?.data?.checkout;

  if (!checkout) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
    value: Number(checkout?.totalPrice?.amount || 0),
    coupon: checkout?.discountApplications?.[0]?.code,
    items: checkout?.lineItems
      ? checkout.lineItems.map((line, index) => ({
          item_id: line.variant?.sku || line.variant?.product?.id || "",
          item_name: line.variant?.product?.title || "",
          affiliation: "",
          coupon: "",
          discount: "",
          index,
          item_brand: line.variant?.product?.vendor || "",
          item_category: line.variant?.product?.type || "",
          item_category2: "",
          item_category3: "",
          item_category4: "",
          item_category5: "",
          item_list_id: "",
          item_list_name: "",
          item_variant: line.variant?.title || "",
          location_id: "",
          price: Number(line.variant?.price?.amount || 0),
          quantity: Number(line.quantity || 1),
        }))
      : [],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

analytics?.subscribe?.("checkout_address_info_submitted", (event) => {
  const ga4_event_name = "add_shipping_info";

  const checkout = event?.data?.checkout;

  if (!checkout) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
    value: Number(checkout?.totalPrice?.amount || 0),
    coupon: checkout?.discountApplications?.[0]?.title || "",
    shipping_tier: checkout?.delivery?.selectedDeliveryOptions?.type,
    items: checkout?.lineItems
      ? checkout.lineItems.map((line, index) => ({
          item_id: line.variant?.sku || line.variant?.product?.id || "",
          item_name: line.variant?.product?.title || "",
          affiliation: "",
          coupon:
            line.discountAllocations?.[0]?.discountApplication?.title || "",
          discount: line.discountAllocations?.[0]?.amount?.amount || 0,
          index,
          item_brand: line.variant?.product?.vendor || "",
          item_category: line.variant?.product?.type || "",
          item_category2: "",
          item_category3: "",
          item_category4: "",
          item_category5: "",
          item_list_id: "",
          item_list_name: "",
          item_variant: line.variant?.title || "",
          location_id: "",
          price: Number(line.variant?.price?.amount || 0),
          quantity: Number(line.quantity || 1),
        }))
      : [],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

analytics?.subscribe?.("payment_info_submitted", (event) => {
  const ga4_event_name = "add_payment_info";

  const checkout = event?.data?.checkout;

  if (!checkout) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
    value: Number(checkout?.totalPrice?.amount || 0),
    coupon: checkout?.discountApplications?.[0]?.title || "",
    payment_type: String(checkout?.paymentMethod || ""),
    items: checkout?.lineItems
      ? checkout.lineItems.map((line, index) => ({
          item_id: line.variant?.sku || line.variant?.product?.id || "",
          item_name: line.variant?.product?.title || "",
          affiliation: "",
          coupon:
            line.discountAllocations?.[0]?.discountApplication?.title || "",
          discount: line.discountAllocations?.[0]?.amount?.amount || 0,
          index,
          item_brand: line.variant?.product?.vendor || "",
          item_category: line.variant?.product?.type || "",
          item_category2: "",
          item_category3: "",
          item_category4: "",
          item_category5: "",
          item_list_id: "",
          item_list_name: "",
          item_variant: line.variant?.title || "",
          location_id: "",
          price: Number(line.variant?.price?.amount || 0),
          quantity: Number(line.quantity || 1),
        }))
      : [],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

analytics?.subscribe?.("checkout_completed", (event) => {
  const ga4_event_name = "purchase";

  const checkout = event?.data?.checkout;

  if (!checkout) {
    pushError(ga4_event_name, "missing analytics api data");
    return;
  }

  const ga4_ecommerce_object = {
    currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
    value: Number(checkout?.totalPrice?.amount || 0),
    customer_type:
      checkout?.order?.customer?.isFirstOrder === false ? "returning" : "new",
    transaction_id: checkout?.order?.id || checkout?.token,
    coupon: checkout?.discountApplications?.[0]?.title,
    shipping: Number(checkout?.shippingLine?.price?.amount || 0),
    tax: Number(checkout?.totalTax?.amount || 0),
    items: checkout?.lineItems
      ? checkout.lineItems.map((line, index) => ({
          item_id: line.variant?.sku || line.variant?.product?.id || "",
          item_name: line.variant?.product?.title || "",
          affiliation: "",
          coupon:
            line.discountAllocations?.[0]?.discountApplication?.title || "",
          discount: line.discountAllocations?.[0]?.amount?.amount || 0,
          index,
          item_brand: line.variant?.product?.vendor || "",
          item_category: line.variant?.product?.type || "",
          item_category2: "",
          item_category3: "",
          item_category4: "",
          item_category5: "",
          item_list_id: "",
          item_list_name: "",
          item_variant: line.variant?.title || "",
          location_id: "",
          price: Number(line.variant?.price?.amount || 0),
          quantity: Number(line.quantity || 1),
        }))
      : [],
  };

  if (!isValidEcommerce(ga4_event_name, ga4_ecommerce_object)) {
    return;
  }

  dataLayer.push({
    event: ga4_event_name,
    ecommerce: ga4_ecommerce_object,
  });
});

/* ---------------------- Search ---------------------- */
analytics?.subscribe?.("search_submitted", (event) => {
  dataLayer.push({
    event: "search",
    search_term: event?.data?.searchResult?.query || "",
  });
});

/* ---------------------- shopify alerts ---------------------- */
analytics?.subscribe?.("alert_displayed", (event) => {
  dataLayer.push({
    event: "alert_displayed",
    alert_message: event?.data?.alert?.message,
    alert_target: event?.data?.alert?.target,
    alert_type: event?.data?.alert?.type,
    alert_value: event?.data?.alert?.value,
  });
});

/* ---------------------- shopify errors ---------------------- */
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

/* ---------------------- Utility functions ---------------------- */
function isLanguageCode(string) {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(string);
}

function getLanguageFromPathname(pathname) {
  if (!pathname || pathname === "/") {
    return defaultShopLanguage;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (isLanguageCode(segments[0])) {
    return segments[0];
  }

  return defaultShopLanguage;
}

function getTypeFromPathname(pathname) {
  if (!pathname || pathname === "/") {
    return "home";
  }

  const lookup = {
    pages: "page",
    collections: "collection",
    products: "product",
    checkout: "checkout",
    blogs: "blog",
    articles: "article",
    search: "search",
    cart: "cart",
    account: "account",
  };

  const segments = pathname.split("/").filter(Boolean);

  const typeSegment = isLanguageCode(segments[0]) ? segments[1] : segments[0];

  return lookup[typeSegment] || "";
}

async function sha256(text) {
  if (!text) return null;
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
