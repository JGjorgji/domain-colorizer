// Shared color utilities used by background, content, and options pages.
(function (root) {
  const ColorUtils = {
    hashHostname(hostname) {
      let hash = 0;
      for (let i = 0; i < hostname.length; i++) {
        hash = (hash << 5) - hash + hostname.charCodeAt(i);
        hash |= 0; // force 32-bit
      }
      return Math.abs(hash);
    },
    hostnameToHsl(hostname) {
      const hash = this.hashHostname(hostname || "");
      const hue = hash % 360;
      const saturation = 65; // percent
      const lightness = 55; // percent
      return { h: hue, s: saturation, l: lightness };
    },
    hslString({ h, s, l }) {
      return `hsl(${h}, ${s}%, ${l}%)`;
    },
    getTextColorForBg({ h, s, l }) {
      // Convert HSL to relative luminance approximation for contrast check.
      const a = s / 100;
      const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l / 100 - a * Math.min(l / 100, 1 - l / 100) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return color;
      };
      const rgb = [f(0), f(8), f(4)].map((v) => {
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      return luminance > 0.45 ? "#0f172a" : "#f8fafc";
    },
    matchesDomainPattern(hostname, pattern) {
      // Convert pattern to regex: * becomes .*
      const regexPattern = pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`, "i");
      return regex.test(hostname);
    },
    isDomainAllowed(hostname, domainMode, domainPatterns) {
      if (domainMode === "all") return true;
      if (domainMode === "allowlist") {
        return domainPatterns.some(pattern => this.matchesDomainPattern(hostname, pattern));
      }
      if (domainMode === "blocklist") {
        return !domainPatterns.some(pattern => this.matchesDomainPattern(hostname, pattern));
      }
      return true;
    }
  };

  // Expose globally
  root.ColorUtils = ColorUtils;
})(typeof self !== "undefined" ? self : this);

