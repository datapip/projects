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
const JSON = require("JSON");
const log = require("logToConsole");

const CONFIG = {
  brazeBaseUrl: data.API_ENDPOINT,
  brazeCdnUrl: "https://js.appboycdn.com",
  allowedOrigins: (data.ALLOWED_ORIGINS || []).map((origin) => origin.url),
  allowedApiKeys: (data.ALLOWED_API_KEYS || []).map((key) => key.value),
  forwardHeaders: [
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
  timeoutApi: 10000,
  timeoutSdk: 5000,
};

// Entry
const path = getRequestPath();
if (!path) return;

// Router
if (path.indexOf("/web-sdk") === 0 && path.indexOf("braze.min.js") !== -1) {
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
    return deny(403, "Origin not allowed");
  }

  const upstreamUrl = CONFIG.brazeCdnUrl + path;
  sendHttpRequest(upstreamUrl, { method: "GET", timeout: CONFIG.timeoutSdk })
    .then(handleSdkSuccess)
    .catch(handleFailure);
}

function handleApi(path) {
  // Setting headers
  const origin = getRequestHeader("origin");
  setHeaders(origin);

  // Origin validation
  if (!isAllowedOrigin(origin)) {
    return deny(403, "Origin not allowed");
  }

  // Handle preflight
  const method = getRequestMethod();
  if (method === "OPTIONS") {
    return handlePreflight();
  }

  // API key validation
  const apiKey = getRequestHeader("x-braze-api-key");
  if (!apiKey || !isValidApiKey(apiKey)) {
    return deny(403, "Invalid API key");
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
function isAllowedReferer(referer) {
  if (!referer) return false;
  var allowed = false;
  CONFIG.allowedOrigins.forEach((origin) => {
    if (origin + "/" === referer) {
      allowed = true;
    }
  });
  return allowed;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return CONFIG.allowedOrigins.indexOf(origin) !== -1;
}

function isValidApiKey(apiKey) {
  if (!apiKey) return false;
  return CONFIG.allowedApiKeys.indexOf(apiKey) !== -1;
}

function setHeaders(origin) {
  const requestedHeaders = getRequestHeader("access-control-request-headers");
  if (requestedHeaders) {
    setResponseHeader("access-control-allow-headers", requestedHeaders);
  }
  setResponseHeader("access-control-allow-origin", origin);
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
  CONFIG.forwardHeaders.forEach((header) => {
    const value = getRequestHeader(header);
    if (value) headers[header] = value;
  });
  if (clientIp) {
    headers["x-forwarded-for"] = clientIp;
  }
  return headers;
}

function handleSdkSuccess(result) {
  if (!result.body || result.statusCode >= 400) {
    return handleFailure();
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
  setResponseStatus(502);
  setResponseBody("Upstream service error");
  returnResponse();
}

function deny(status, message) {
  setResponseStatus(status);
  setResponseBody(message);
  returnResponse();
}
