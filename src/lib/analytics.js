// Thin wrapper around GA4's gtag.js.
//
// The gtag.js loader script is included in index.html with a placeholder
// measurement ID (G-XXXXXXXXXX). Every call here is guarded so the app never
// throws if analytics is blocked (ad blockers, offline, no consent yet) —
// it just becomes a no-op.

const MEASUREMENT_ID = "G-XXXXXXXXXX";
let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line no-inner-declarations
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: true });
  initialized = true;
}

export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    // Analytics failures should never break the UI.
  }
}
