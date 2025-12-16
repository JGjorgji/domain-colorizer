/* global ColorUtils */

const DEFAULTS = {
  bannerText: "Domain Colorizer",
  bannerHeight: 32,
  domainMode: "all",
  domainPatterns: []
};

const bannerTextInput = document.getElementById("bannerText");
const bannerHeightInput = document.getElementById("bannerHeight");
const domainInput = document.getElementById("domainInput");
const colorInput = document.getElementById("colorInput");
const addOverrideBtn = document.getElementById("addOverride");
const overrideList = document.getElementById("overrideList");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");
const domainModeAll = document.getElementById("domainModeAll");
const domainModeAllowlist = document.getElementById("domainModeAllowlist");
const domainModeBlocklist = document.getElementById("domainModeBlocklist");
const domainPatternsSection = document.getElementById("domainPatternsSection");
const patternInput = document.getElementById("patternInput");
const addPatternBtn = document.getElementById("addPattern");
const patternList = document.getElementById("patternList");

let overrides = {};
let domainPatterns = [];

function hslToHex(hsl) {
  const { h, s, l } = hsl;
  const a = s / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.min(l / 100, 1 - l / 100) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToHsl(hex) {
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!res) return ColorUtils.hostnameToHsl("");
  let [r, g, b] = res.slice(1).map((v) => parseInt(v, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

async function load() {
  const data = await chrome.storage.sync.get({
    bannerText: DEFAULTS.bannerText,
    bannerHeight: DEFAULTS.bannerHeight,
    overrides: {},
    domainMode: DEFAULTS.domainMode,
    domainPatterns: DEFAULTS.domainPatterns
  });
  bannerTextInput.value = data.bannerText;
  bannerHeightInput.value = data.bannerHeight;
  overrides = data.overrides || {};
  domainPatterns = data.domainPatterns || [];
  
  if (data.domainMode === "allowlist") {
    domainModeAllowlist.checked = true;
  } else if (data.domainMode === "blocklist") {
    domainModeBlocklist.checked = true;
  } else {
    domainModeAll.checked = true;
  }
  
  updateDomainPatternsSection();
  renderPatterns();
  renderOverrides();
}

function updateDomainPatternsSection() {
  const mode = domainModeAllowlist.checked ? "allowlist" : 
               domainModeBlocklist.checked ? "blocklist" : "all";
  domainPatternsSection.style.display = mode === "all" ? "none" : "block";
}

function renderPatterns() {
  patternList.innerHTML = "";
  domainPatterns.forEach((pattern, idx) => {
    const el = document.createElement("div");
    el.className = "badge";
    el.innerHTML = `
      <span style="flex: 1;">${pattern}</span>
      <button data-index="${idx}">Remove</button>
    `;
    el.querySelector("button").addEventListener("click", () => {
      domainPatterns.splice(idx, 1);
      renderPatterns();
    });
    patternList.appendChild(el);
  });
}

function renderOverrides() {
  overrideList.innerHTML = "";
  Object.entries(overrides).forEach(([domain, conf]) => {
    const el = document.createElement("div");
    el.className = "badge";
    const hsl = conf.hsl || ColorUtils.hostnameToHsl(domain);
    const color = ColorUtils.hslString(hsl);
    const textColor = conf.textColor || ColorUtils.getTextColorForBg(hsl);
    el.innerHTML = `
      <span class="color-swatch" style="background:${color};"></span>
      <span style="color:${textColor}; font-weight:600;">${domain}</span>
      <span style="color:${textColor};">${color}</span>
      <button data-domain="${domain}">Remove</button>
    `;
    el.querySelector("button").addEventListener("click", () => {
      delete overrides[domain];
      renderOverrides();
    });
    overrideList.appendChild(el);
  });
}

domainModeAll.addEventListener("change", updateDomainPatternsSection);
domainModeAllowlist.addEventListener("change", updateDomainPatternsSection);
domainModeBlocklist.addEventListener("change", updateDomainPatternsSection);

addPatternBtn.addEventListener("click", () => {
  const pattern = patternInput.value.trim().toLowerCase();
  if (!pattern || domainPatterns.includes(pattern)) return;
  domainPatterns.push(pattern);
  patternInput.value = "";
  renderPatterns();
});

patternInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addPatternBtn.click();
  }
});

addOverrideBtn.addEventListener("click", () => {
  const domain = domainInput.value.trim().toLowerCase();
  if (!domain) return;
  const hsl = hexToHsl(colorInput.value || "#ffffff");
  overrides[domain] = {
    hsl,
    textColor: ColorUtils.getTextColorForBg(hsl)
  };
  renderOverrides();
});

saveBtn.addEventListener("click", async () => {
  const domainMode = domainModeAllowlist.checked ? "allowlist" : 
                     domainModeBlocklist.checked ? "blocklist" : "all";
  const payload = {
    bannerText: bannerTextInput.value || DEFAULTS.bannerText,
    bannerHeight: Number(bannerHeightInput.value) || DEFAULTS.bannerHeight,
    overrides,
    domainMode,
    domainPatterns
  };
  await chrome.storage.sync.set(payload);
  statusEl.textContent = "Saved";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});

resetBtn.addEventListener("click", async () => {
  overrides = {};
  domainPatterns = [];
  bannerTextInput.value = DEFAULTS.bannerText;
  bannerHeightInput.value = DEFAULTS.bannerHeight;
  domainModeAll.checked = true;
  await chrome.storage.sync.set({
    bannerText: DEFAULTS.bannerText,
    bannerHeight: DEFAULTS.bannerHeight,
    overrides: {},
    domainMode: DEFAULTS.domainMode,
    domainPatterns: DEFAULTS.domainPatterns
  });
  updateDomainPatternsSection();
  renderPatterns();
  renderOverrides();
  statusEl.textContent = "Reset";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});

load();

