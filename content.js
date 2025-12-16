/* global ColorUtils */

const BANNER_ID = "__domain_colorizer_banner__";
let currentHostname = "";

function ensureBanner({ hostname, color, textColor, bannerText, bannerHeight }) {
  if (window.top !== window) return; // skip iframes

  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.zIndex = "2147483646";
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.justifyContent = "space-between";
    banner.style.padding = "0 12px";
    banner.style.boxSizing = "border-box";
    banner.style.fontFamily = "system-ui, sans-serif";
    banner.style.fontSize = "12px";
    banner.style.lineHeight = "1";
    banner.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
    document.documentElement.style.paddingTop = `${bannerHeight}px`;
    
    // Ensure body exists before prepending
    if (document.body) {
      document.body.prepend(banner);
    } else {
      // If body doesn't exist yet, append to documentElement and move later
      document.documentElement.appendChild(banner);
      // Move to body when it becomes available
      const observer = new MutationObserver(() => {
        if (document.body && banner.parentNode !== document.body) {
          document.body.prepend(banner);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      // Fallback: try again after a short delay
      setTimeout(() => {
        if (document.body && banner.parentNode !== document.body) {
          document.body.prepend(banner);
        }
        observer.disconnect();
      }, 100);
    }
  }

  banner.style.height = `${bannerHeight}px`;
  banner.style.background = color;
  banner.style.color = textColor;

  banner.innerHTML = `
    <span style="font-weight:600;">${hostname}</span>
    <span style="opacity:0.85;">${bannerText}</span>
  `;
}

function hideBanner() {
  const banner = document.getElementById(BANNER_ID);
  if (banner) {
    banner.remove();
    document.documentElement.style.paddingTop = "";
  }
}

function handleMessage(message) {
  if (message?.type === "domain-color-hide") {
    hideBanner();
    return;
  }
  if (message?.type !== "domain-color-update") return;
  const { hostname, color, textColor, bannerText, bannerHeight } = message.payload;
  if (!hostname) return;
  currentHostname = hostname;
  ensureBanner({ hostname, color, textColor, bannerText, bannerHeight });
}

function requestColor() {
  chrome.runtime.sendMessage({ type: "request-domain-color" }).catch(() => {});
}

chrome.runtime.onMessage.addListener(handleMessage);

// Request color on multiple events to ensure it always runs
function ensureColorRequest() {
  requestColor();
}

// Initial request
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureColorRequest);
} else {
  ensureColorRequest();
}

// Also request when document becomes ready
if (document.readyState === "complete") {
  ensureColorRequest();
} else {
  window.addEventListener("load", ensureColorRequest);
}

// Observe SPA nav via history/state changes
window.addEventListener("popstate", ensureColorRequest, true);
["pushState", "replaceState"].forEach((key) => {
  const original = history[key];
  history[key] = function (...args) {
    const result = original.apply(this, args);
    setTimeout(ensureColorRequest, 0);
    return result;
  };
});

// Fallback: periodically check if banner exists and request if needed (for edge cases)
let checkInterval = setInterval(() => {
  if (window.top === window && !document.getElementById(BANNER_ID) && currentHostname) {
    ensureColorRequest();
  }
}, 1000);

// Clear interval after 10 seconds to avoid unnecessary checks
setTimeout(() => clearInterval(checkInterval), 10000);

