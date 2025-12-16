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
let patternColors = {};

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
    domainPatterns: DEFAULTS.domainPatterns,
    patternColors: {}
  });
  bannerTextInput.value = data.bannerText;
  bannerHeightInput.value = data.bannerHeight;
  overrides = data.overrides || {};
  domainPatterns = data.domainPatterns || [];
  patternColors = data.patternColors || {};
  
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
    const patternColor = patternColors[pattern] || ColorUtils.hostnameToHsl(pattern);
    const colorHex = hslToHex(patternColor);
    const colorDisplay = ColorUtils.hslString(patternColor);
    const textColor = patternColors[pattern]?.textColor || ColorUtils.getTextColorForBg(patternColor);
    
    el.innerHTML = `
      <input type="color" data-pattern="${pattern}" value="${colorHex}" style="width: 40px; height: 32px; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;">
      <span style="flex: 1; font-weight: 600;">${pattern}</span>
      <span class="color-preview" data-pattern="${pattern}" style="color: ${textColor}; background: ${colorDisplay}; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${colorDisplay}</span>
      <button data-index="${idx}">Remove</button>
    `;
    
    const colorInput = el.querySelector('input[type="color"]');
    const colorPreview = el.querySelector('.color-preview');
    
    colorInput.addEventListener("input", (e) => {
      // Update in real-time as user drags the color picker
      const hsl = hexToHsl(e.target.value);
      patternColors[pattern] = {
        hsl,
        textColor: ColorUtils.getTextColorForBg(hsl)
      };
      updatePatternColorDisplay(pattern, colorPreview, hsl);
    });
    
    colorInput.addEventListener("change", (e) => {
      // Final update when user confirms selection
      const hsl = hexToHsl(e.target.value);
      patternColors[pattern] = {
        hsl,
        textColor: ColorUtils.getTextColorForBg(hsl)
      };
      updatePatternColorDisplay(pattern, colorPreview, hsl);
    });
    
    el.querySelector("button").addEventListener("click", () => {
      domainPatterns.splice(idx, 1);
      delete patternColors[pattern];
      renderPatterns();
    });
    patternList.appendChild(el);
  });
}

function updatePatternColorDisplay(pattern, previewEl, hsl) {
  if (!previewEl) return;
  const colorDisplay = ColorUtils.hslString(hsl);
  const textColor = ColorUtils.getTextColorForBg(hsl);
  previewEl.textContent = colorDisplay;
  previewEl.style.background = colorDisplay;
  previewEl.style.color = textColor;
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
  
  // Clean up patternColors to remove entries for patterns that no longer exist
  const cleanedPatternColors = {};
  domainPatterns.forEach(pattern => {
    if (patternColors[pattern]) {
      cleanedPatternColors[pattern] = patternColors[pattern];
    }
  });
  
  const payload = {
    bannerText: bannerTextInput.value || DEFAULTS.bannerText,
    bannerHeight: Number(bannerHeightInput.value) || DEFAULTS.bannerHeight,
    overrides,
    domainMode,
    domainPatterns,
    patternColors: cleanedPatternColors
  };
  await chrome.storage.sync.set(payload);
  patternColors = cleanedPatternColors;
  statusEl.textContent = "Saved";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});

resetBtn.addEventListener("click", async () => {
  overrides = {};
  domainPatterns = [];
  patternColors = {};
  bannerTextInput.value = DEFAULTS.bannerText;
  bannerHeightInput.value = DEFAULTS.bannerHeight;
  domainModeAll.checked = true;
  await chrome.storage.sync.set({
    bannerText: DEFAULTS.bannerText,
    bannerHeight: DEFAULTS.bannerHeight,
    overrides: {},
    domainMode: DEFAULTS.domainMode,
    domainPatterns: DEFAULTS.domainPatterns,
    patternColors: {}
  });
  updateDomainPatternsSection();
  renderPatterns();
  renderOverrides();
  statusEl.textContent = "Reset";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});

load();

