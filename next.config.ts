import type { NextConfig } from "next";
import path from "path";

// Security headers for FERPA compliance and protection
const securityHeaders = [
  {
    // Prevent clickjacking attacks
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Enable XSS filter in older browsers
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Permissions policy - restrict features we don't need
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Content Security Policy - protect against XSS and injection
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
  {
    // Strict Transport Security - force HTTPS
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Strong default for catching side effects & bad assumptions in dev.
  // (You want this on for a multi-module compliance app.)
  reactStrictMode: true, // Next.js option list: reactStrictMode :contentReference[oaicite:0]{index=0}

  // Removes "X-Powered-By: Next.js" header (minor security/cleanliness).
  poweredByHeader: false, // poweredByHeader :contentReference[oaicite:1]{index=1}

  // Security headers applied to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Turn on when you want Docker / self-host / portable artifact builds.
  // If you're deploying purely on Vercel, you can remove this.
  output: "standalone", // output :contentReference[oaicite:2]{index=2}

  // Your app serves local artifacts (xlsx/pdf) and probably doesn't need remote images yet.
  // Add remotePatterns later if you start using external image hosts.
  images: {
    // Leaving defaults is fine; this makes intent explicit.
    // remotePatterns: [{ protocol: "https", hostname: "…"}],
  }, // images :contentReference[oaicite:3]{index=3}

  // If you start using Server Actions later, you can tune allowed origins/body size here.
  // Leaving it undefined keeps behavior default + predictable for now.
  // serverActions: { bodySizeLimit: "2mb" }, // serverActions :contentReference[oaicite:4]{index=4}

  experimental: {
    // BIG ONE for your app: large PDF uploads (IEPs) + exports can exceed proxy limits.
    // This allows larger proxied request bodies in environments where Next proxies requests.
    // Set to the smallest value that covers your real upload sizes (e.g., "25mb", "50mb").
    proxyClientMaxBodySize: "50mb", // proxyClientMaxBodySize :contentReference[oaicite:5]{index=5}
  },

  // Pin Turbopack's filesystem root to this project directory so it never
  // walks up into the parent AccommodationsAudit folder (which contains a
  // .venv with broken symlinks that cause Turbopack to panic at build time).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
