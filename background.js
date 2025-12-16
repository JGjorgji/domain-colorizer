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
    domainPatterns: [],
    patternColors: {}
  });
  return {
    overrides: data.overrides || {},
    bannerText: data.bannerText || DEFAULTS.bannerText,
    bannerHeight: typeof data.bannerHeight === "number" ? data.bannerHeight : DEFAULTS.bannerHeight,
    domainMode: data.domainMode || "all",
    domainPatterns: data.domainPatterns || [],
    patternColors: data.patternColors || {}
  };
}

async function computeColor(hostname) {
  const settings = await getSettings();
  
  // First check for exact domain override
  const override = settings.overrides[hostname];
  if (override && override.hsl) {
    return { color: ColorUtils.hslString(override.hsl), textColor: override.textColor || ColorUtils.getTextColorForBg(override.hsl) };
  }
  
  // Then check for pattern match (patterns are checked in order, first match wins)
  // Pattern colors work regardless of domainMode - they're just color assignments
  for (const pattern of settings.domainPatterns) {
    if (ColorUtils.matchesDomainPattern(hostname, pattern)) {
      const patternColor = settings.patternColors[pattern];
      if (patternColor && patternColor.hsl) {
        return { 
          color: ColorUtils.hslString(patternColor.hsl), 
          textColor: patternColor.textColor || ColorUtils.getTextColorForBg(patternColor.hsl) 
        };
      }
    }
  }
  
  // Default: generate color from hostname
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
  // Send update on both loading and complete to ensure it always runs
  if ((changeInfo.status === "loading" || changeInfo.status === "complete") && tab.url) {
    const hostname = extractHostname(tab.url);
    // Use setTimeout to ensure URL is fully updated
    setTimeout(() => {
      chrome.tabs.get(tabId).then(updatedTab => {
        if (updatedTab.url) {
          sendUpdateToTab(tabId, extractHostname(updatedTab.url));
        }
      }).catch(() => {});
    }, changeInfo.status === "loading" ? 0 : 100);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const hostname = extractHostname(tab.url || "");
  sendUpdateToTab(tabId, hostname);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "request-domain-color" && sender.tab?.id) {
    // Get fresh tab info to ensure we have the latest URL
    chrome.tabs.get(sender.tab.id).then(tab => {
      const hostname = extractHostname(tab.url || "");
      sendUpdateToTab(sender.tab.id, hostname);
    }).catch(() => {});
  }
  if (message?.type === "save-settings") {
    chrome.storage.sync.set(message.payload || {}, () => sendResponse({ ok: true }));
    return true;
  }
});

