const getAllEventData = require("getAllEventData");
const getRequestHeader = require("getRequestHeader");
const getRequestPath = require("getRequestPath");
const getRequestQueryString = require("getRequestQueryString");
const getClientName = require("getClientName");
const getContainerVersion = require("getContainerVersion");
const logToConsole = require("logToConsole");

const eventData = getAllEventData();
const containerData = getContainerVersion();
const containerId = containerData.containerId;
const containerVersion = containerData.containerVersion;
const headers = {
  "user-agent": getRequestHeader("user-agent"),
  "x-forwarded-for": getRequestHeader("x-forwarded-for"),
  referer: getRequestHeader("referer"),
  origin: getRequestHeader("origin"),
  "content-type": getRequestHeader("content-type"),
  "x-gtm-server-preview": getRequestHeader("x-gtm-server-preview"),
};

logToConsole("_____ REQUEST START: '" + eventData.event_name + "' _____");
logToConsole("[1] Meta Data:");
logToConsole("- Client       : " + getClientName());
logToConsole("- Container    : " + containerId + " " + containerVersion);
logToConsole("- Request Path : " + getRequestPath());
logToConsole("- Query String : " + getRequestQueryString());
logToConsole("[2] Request Headers");
for (var key in headers) {
  logToConsole("- " + key + " : " + headers[key]);
}
logToConsole("[3] Event Data");
for (var key in eventData) {
  logToConsole("- " + key + " : " + eventData[key]);
}
logToConsole("_____ REQUEST END: '" + eventData.event_name + "' _____");

data.gtmOnSuccess();
