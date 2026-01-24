/* Version 1.1.4 */

const IS_PROD =
  init?.context?.document?.location?.hostname?.endsWith(".schiesser.com");
const ENVIRONMENT = IS_PROD ? "production" : "development";
const USER_MAIL = (init?.data?.customer?.email || "").toLowerCase();
const USER_ID = (init?.data?.customer?.id || "").toLowerCase();
const USER_PHONE = init?.data?.customer?.phone || null;
const USER_ORDERS_COUNT = init?.data?.customer?.ordersCount || null;
const COUNTRY = (init?.data?.shop?.countryCode || "").toLowerCase();

/* ---------------------- Default consent ---------------------- */
let privacy = {
  consent_analytics: false,
  consent_marketing: false,
};

/* ---------------------- Initialize dataLayer ---------------------- */
window.dataLayer = window.dataLayer || [];

if (!IS_PROD) {
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
    const amount = data.productVariant?.price?.amount;
    const currency = data.productVariant?.price?.currencyCode;

    if (amount == null || currency == null) {
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

    if (currency == null || amount == null) {
      valid = false;
    }
  }

  if (data.hasOwnProperty("cart")) {
    const hasLines =
      Array.isArray(data.cart?.lines) && data.cart.lines.length > 0;
    const currency = data.cart?.cost?.totalAmount?.currencyCode;
    const amount = data.cart?.cost?.totalAmount?.amount;

    if (!hasLines || currency == null || amount == null) {
      valid = false;
    }
  }

  if (data.hasOwnProperty("checkout")) {
    const hasLineItems =
      Array.isArray(data.checkout?.lineItems) &&
      data.checkout.lineItems.length > 0;
    const currency = data.checkout?.totalPrice?.currencyCode;
    const amount = data.checkout?.totalPrice?.amount;

    if (!hasLineItems || currency == null || amount == null) {
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

/* ---------------------- Page view ---------------------- */
analytics?.subscribe?.("page_viewed", (event) => {
  dataLayer.push({
    event: "page_view",
    page_location: event?.context?.document?.location?.href,
    page_title: event?.context?.document?.title,
    country_code: COUNTRY,
    environment: ENVIRONMENT,
    user_email: USER_MAIL,
    user_id: USER_ID,
    user_phone: USER_PHONE,
    user_ordersCount: USER_ORDERS_COUNT,
  });
});

/* ---------------------- Collection view ---------------------- */
analytics?.subscribe?.("collection_viewed", (event) => {
  if (!hasRequiredData(event?.data, "collection_viewed")) return;

  const collection = event?.data?.collection;

  dataLayer.push({
    event: "view_item_list",
    ecommerce: {
      currency: "",
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
      currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      coupon: checkout?.discountApplications?.[0]?.code,
      items: checkout.lineItems
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
    },
  });
});

analytics?.subscribe?.("checkout_address_info_submitted", (event) => {
  if (!hasRequiredData(event?.data, "checkout_address_info_submitted")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "add_shipping_info",
    ecommerce: {
      currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      coupon: checkout.discountApplications[0]?.title || "",
      shipping_tier: checkout?.delivery?.selectedDeliveryOptions?.type,
      items: checkout.lineItems
        ? checkout.lineItems.map((line, index) => ({
            item_id: line.variant?.sku || line.variant?.product?.id || "",
            item_name: line.variant?.product?.title || "",
            affiliation: "",
            coupon:
              line.discountAllocations[0]?.discountApplication?.title || "",
            discount: line.discountAllocations[0]?.amount?.amount || 0,
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
    },
  });
});

analytics?.subscribe?.("payment_info_submitted", (event) => {
  if (!hasRequiredData(event?.data, "payment_info_submitted")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "add_payment_info",
    ecommerce: {
      currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      coupon: checkout.discountApplications[0]?.title || "",
      payment_type: checkout?.paymentMethod,
      items: checkout.lineItems
        ? checkout.lineItems.map((line, index) => ({
            item_id: line.variant?.sku || line.variant?.product?.id || "",
            item_name: line.variant?.product?.title || "",
            affiliation: "",
            coupon:
              line.discountAllocations[0]?.discountApplication?.title || "",
            discount: line.discountAllocations[0]?.amount?.amount || 0,
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
    },
  });
});

analytics?.subscribe?.("checkout_completed", (event) => {
  if (!hasRequiredData(event?.data, "checkout_completed")) return;

  const checkout = event?.data?.checkout;

  dataLayer.push({
    event: "purchase",
    ecommerce: {
      currency: checkout?.totalPrice?.currencyCode || checkout?.currencyCode,
      value: Number(checkout?.totalPrice?.amount || 0),
      customer_type:
        checkout.order?.customer?.isFirstOrder === false ? "returning" : "new",
      transaction_id: checkout?.order?.id || checkout?.token,
      coupon: checkout?.discountApplications?.[0]?.title,
      shipping: Number(checkout?.shippingLine?.price?.amount || 0),
      tax: Number(checkout?.totalTax?.amount || 0),
      items: checkout.lineItems
        ? checkout.lineItems.map((line, index) => ({
            item_id: line.variant?.sku || line.variant?.product?.id || "",
            item_name: line.variant?.product?.title || "",
            affiliation: "",
            coupon:
              line.discountAllocations[0]?.discountApplication?.title || "",
            discount: line.discountAllocations[0]?.amount?.amount || 0,
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
