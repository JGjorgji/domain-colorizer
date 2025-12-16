# Domain Colorizer (Chrome MV3)

Chrome extension that assigns a deterministic color per domain/subdomain and shows a fixed banner on every page for quick visual identification. Includes an options page to tweak banner text/height and add per-domain overrides.

## Load in Chrome
1. `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder

## How it works
- Background service worker computes color (hash→HSL) for each tab hostname, factoring in overrides from `chrome.storage.sync`.
- Content script injects a fixed top banner with the domain label and colors; updates on navigation including SPA history changes.
- Options page lets you set banner text/height and per-domain colors; stored in sync storage.

## Files
- `manifest.json` – MV3 config (background, content script, options page).
- `color.js` – shared color helpers.
- `background.js` – tab listeners, color computation, messaging, storage.
- `content.js` – inject/update banner.
- `options.html|css|js` – configuration UI.

## Notes
- Runs on all URLs; skips iframes.
- Deterministic color per hostname; text color chosen for contrast.

