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

logToConsole("[SST DEBUG] _____ START _____");

logToConsole("[SST DEBUG] --- Meta Data ---");

logToConsole("[SST DEBUG] Client       :", getClientName());
logToConsole("[SST DEBUG] Container    :", containerId, containerVersion);
logToConsole("[SST DEBUG] Request Path :", getRequestPath());
logToConsole("[SST DEBUG] Query String :", getRequestQueryString());

logToConsole("[SST DEBUG] --- Request Headers ---");

for (var key in headers) {
  logToConsole("[SST DEBUG]", key, ":", headers[key]);
}

logToConsole("[SST DEBUG] --- Event Data ---");

for (var key in eventData) {
  logToConsole("[SST DEBUG]", key, ":", eventData[key]);
}

logToConsole("[SST DEBUG] ______ END ______");

data.gtmOnSuccess();
