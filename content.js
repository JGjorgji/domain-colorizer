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
    document.body.prepend(banner);
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
  chrome.runtime.sendMessage({ type: "request-domain-color" });
}

chrome.runtime.onMessage.addListener(handleMessage);

// Initial request and observe SPA nav via history/state changes.
requestColor();
window.addEventListener("popstate", requestColor, true);
["pushState", "replaceState"].forEach((key) => {
  const original = history[key];
  history[key] = function (...args) {
    const result = original.apply(this, args);
    requestColor();
    return result;
  };
});

