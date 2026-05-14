const claimRequest = require("claimRequest");
const getRequestPath = require("getRequestPath");
const getRequestMethod = require("getRequestMethod");
const getRequestQueryString = require("getRequestQueryString");
const getRequestBody = require("getRequestBody");
const getRequestHeader = require("getRequestHeader");
const getRemoteAddress = require("getRemoteAddress");
const sendHttpRequest = require("sendHttpRequest");
const returnResponse = require("returnResponse");
const setResponseHeader = require("setResponseHeader");
const setResponseBody = require("setResponseBody");
const setResponseStatus = require("setResponseStatus");
const makeNumber = require("makeNumber");
const log = require("logToConsole");
const JSON = require("JSON");

const CONFIG = {
  brazeCdnUrl: "https://js.appboycdn.com",
  brazeBaseUrl: data.API_ENDPOINT,
  allowedOrigin: data.ALLOWED_ORIGIN || "",
  allowedApiKey: data.ALLOWED_API_KEY || "",
  additionalHeaders: (data.ADDITIONAL_HEADERS || []).map((key) => key.HEADER),
  timeoutSdk: makeNumber(data.SDK_TIMEOUT || 5000),
  timeoutApi: makeNumber(data.API_TIMEOUT || 10000),
  standardHeaders: [
    "x-braze-sdk-version",
    "x-braze-request-id",
    "x-braze-sdk-flavor",
    "x-braze-api-key",
    "x-braze-datacenters",
    "x-braze-device-id",
    "x-braze-datarequest",
    "braze-sync-retry-count",
    "x-braze-last-req-ms-ago",
    "x-braze-req-attempt",
    "x-braze-triggersrequest",
    "x-requested-with",
    "x-ratelimit-limit",
    "x-braze-contentcardsrequest",
    "x-braze-req-tokens-remaining",
    "content-type",
    "user-agent",
    "origin",
    "referer",
  ],
  blockedResponseHeaders: [
    "content-length",
    "transfer-encoding",
    "connection",
    "content-encoding",
    "access-control-allow-origin",
    "access-control-allow-credentials",
  ],
};

// Logging
const previewHeader = getRequestHeader("x-gtm-server-preview");
const isPreview = !!previewHeader;
if (isPreview) log("Braze Proxy: config", CONFIG);

// Entry
const path = getRequestPath();
if (!path) return;

// Router
if (path.indexOf("/web-sdk/") === 0 && path.slice(-13) === "/braze.min.js") {
  claimRequest();
  handleSdk(path);
} else if (path.indexOf("/api/v3/") === 0) {
  claimRequest();
  handleApi(path);
}

// Logic handlers
function handleSdk(path) {
  // Origin validation
  const referer = getRequestHeader("referer");

  if (!isAllowedReferer(referer)) {
    if (isPreview) log("Braze Proxy: referrer not allowed:", referer);
    return deny(403, "Forbidden");
  }

  const upstreamUrl = CONFIG.brazeCdnUrl + path;
  sendHttpRequest(upstreamUrl, { method: "GET", timeout: CONFIG.timeoutSdk })
    .then(handleSdkSuccess)
    .catch(handleFailure);
}

function handleApi(path) {
  // Get origin
  const origin = getRequestHeader("origin");

  // Origin validation
  if (!isAllowedOrigin(origin)) {
    if (isPreview) log("Braze Proxy: origin not allowed:", origin);
    return deny(403, "Forbidden");
  }

  // Set headers
  setHeaders(origin);

  // Handle preflight
  const method = getRequestMethod();
  if (method === "OPTIONS") {
    return handlePreflight();
  }

  // API key validation
  const apiKey = getRequestHeader("x-braze-api-key");
  if (!apiKey || !isValidApiKey(apiKey)) {
    if (isPreview) log("Braze Proxy: api key missing or not allowed");
    return deny(403, "Forbidden");
  }

  // Request preparation
  const requestBody = normalizeBody(getRequestBody());
  const targetUrl = buildTargetUrl(path, getRequestQueryString());
  const clientIp = getRemoteAddress();
  const headers = buildForwardHeaders(clientIp);

  // Forward request
  sendHttpRequest(
    targetUrl,
    { method: method, headers: headers, timeout: CONFIG.timeoutApi },
    requestBody,
  )
    .then(handleApiSuccess)
    .catch(handleFailure);
}

// Helpers
function isAllowedOrigin(origin) {
  if (isPreview) log("Braze Proxy: check origin:", origin);

  if (!CONFIG.allowedOrigin) return true;

  return origin === CONFIG.allowedOrigin;
}

function isAllowedReferer(referer) {
  if (isPreview) log("Braze Proxy: check referer:", referer);

  if (!CONFIG.allowedOrigin) return true;

  if (!referer) return false;

  return referer.indexOf(CONFIG.allowedOrigin) === 0;
}

function isValidApiKey(apiKey) {
  if (isPreview) log("Braze Proxy: check api key:", apiKey);

  if (!CONFIG.allowedApiKey) return true;

  return apiKey === CONFIG.allowedApiKey;
}

function setHeaders(origin) {
  const requestedHeaders = getRequestHeader("access-control-request-headers");
  if (requestedHeaders) {
    setResponseHeader("access-control-allow-headers", requestedHeaders);
  }
  setResponseHeader("access-control-allow-origin", origin);
  setResponseHeader("access-control-max-age", "86400");
  setResponseHeader("access-control-allow-credentials", "true");
  setResponseHeader("access-control-allow-methods", "POST,GET,OPTIONS");
  setResponseHeader("vary", "origin");
}

function handlePreflight() {
  setResponseStatus(204);
  returnResponse();
}

function normalizeBody(body) {
  if (!body) return "";
  if (typeof body === "object") {
    return JSON.stringify(body);
  }
  return body;
}

function buildTargetUrl(path, queryString) {
  return CONFIG.brazeBaseUrl + path + (queryString ? "?" + queryString : "");
}

function buildForwardHeaders(clientIp) {
  const headers = {};
  const forwardHeaders = [].concat(
    CONFIG.standardHeaders,
    CONFIG.additionalHeaders,
  );
  forwardHeaders.forEach((header) => {
    const value = getRequestHeader(header);
    if (value) headers[header] = value;
  });
  if (clientIp) {
    headers["x-forwarded-for"] = clientIp;
  }
  return headers;
}

function handleSdkSuccess(result) {
  if (result.statusCode >= 400) {
    return handleFailure("CDN returned: " + result.statusCode);
  }
  setResponseHeader("cache-control", "public, max-age=14400");
  setResponseHeader("content-type", "application/javascript");
  setResponseStatus(result.statusCode);
  setResponseBody(result.body);
  returnResponse();
}

function handleApiSuccess(result) {
  setResponseStatus(result.statusCode);
  if (result.headers) {
    for (const key in result.headers) {
      const lowerKey = key.toLowerCase();
      if (CONFIG.blockedResponseHeaders.indexOf(lowerKey) === -1) {
        setResponseHeader(key, result.headers[key]);
      }
    }
  }
  setResponseBody(result.body || "");
  returnResponse();
}

function handleFailure(error) {
  if (error && isPreview) log("Braze Proxy: error", error);
  setResponseStatus(502);
  setResponseBody("Upstream service error");
  returnResponse();
}

function deny(status, message) {
  setResponseStatus(status);
  setResponseBody(message);
  returnResponse();
}
