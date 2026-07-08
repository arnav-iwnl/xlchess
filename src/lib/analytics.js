// Thin wrapper around GA4's gtag.js.


export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    // Analytics failures should never break the UI.
  }
}
