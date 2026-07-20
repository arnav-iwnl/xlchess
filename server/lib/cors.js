export function getDynamicCorsOrigin(origin, callback) {
  // Allow requests with no origin (like mobile apps or curl)
  if (!origin) return callback(null, true);

  // Check localhost variations
  const isLocalhost = origin.match(/^http:\/\/(.*?\.)?localhost:(5173|4173)$/);

  // Check production variations based on FRONTEND_URL
  let isProd = false;
  if (process.env.FRONTEND_URL) {
    try {
      const prodUrl = new URL(process.env.FRONTEND_URL);
      const originUrl = new URL(origin);
      
      // Allow exact match or subdomains
      if (
        originUrl.hostname === prodUrl.hostname ||
        originUrl.hostname.endsWith("." + prodUrl.hostname)
      ) {
        isProd = true;
      }
    } catch (e) {
      // Invalid URLs will fail gracefully
    }
  }

  if (isLocalhost || isProd) {
    return callback(null, true);
  }

  return callback(new Error("Not allowed by CORS"));
}
