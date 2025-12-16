/* global ColorUtils */

importScripts("color.js");

const DEFAULTS = {
  bannerText: "Domain Colorizer",
  bannerHeight: 32
};

async function getSettings() {
  const data = await chrome.storage.sync.get({
    overrides: {},
    bannerText: DEFAULTS.bannerText,
    bannerHeight: DEFAULTS.bannerHeight,
    domainMode: "all",
    domainPatterns: []
  });
  return {
    overrides: data.overrides || {},
    bannerText: data.bannerText || DEFAULTS.bannerText,
    bannerHeight: typeof data.bannerHeight === "number" ? data.bannerHeight : DEFAULTS.bannerHeight,
    domainMode: data.domainMode || "all",
    domainPatterns: data.domainPatterns || []
  };
}

async function computeColor(hostname) {
  const settings = await getSettings();
  const override = settings.overrides[hostname];
  if (override && override.hsl) {
    return { color: ColorUtils.hslString(override.hsl), textColor: override.textColor || ColorUtils.getTextColorForBg(override.hsl) };
  }
  const hsl = ColorUtils.hostnameToHsl(hostname);
  return { color: ColorUtils.hslString(hsl), textColor: ColorUtils.getTextColorForBg(hsl) };
}

async function sendUpdateToTab(tabId, hostname) {
  if (!hostname) return;
  
  const settings = await getSettings();
  
  // Check if domain is allowed based on configuration
  if (!ColorUtils.isDomainAllowed(hostname, settings.domainMode, settings.domainPatterns)) {
    // Send a message to hide the banner if it exists
    chrome.tabs.sendMessage(tabId, {
      type: "domain-color-hide"
    }).catch(() => {});
    return;
  }
  
  const { color, textColor } = await computeColor(hostname);
  chrome.tabs.sendMessage(tabId, {
    type: "domain-color-update",
    payload: {
      hostname,
      color,
      textColor,
      bannerText: settings.bannerText,
      bannerHeight: settings.bannerHeight
    }
  }).catch(() => {});
}

function extractHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    const hostname = extractHostname(tab.url);
    sendUpdateToTab(tabId, hostname);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const hostname = extractHostname(tab.url || "");
  sendUpdateToTab(tabId, hostname);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "request-domain-color" && sender.tab?.id) {
    const hostname = extractHostname(sender.tab.url || "");
    sendUpdateToTab(sender.tab.id, hostname);
  }
  if (message?.type === "save-settings") {
    chrome.storage.sync.set(message.payload || {}, () => sendResponse({ ok: true }));
    return true;
  }
});

