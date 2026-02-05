import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strong default for catching side effects & bad assumptions in dev.
  // (You want this on for a multi-module compliance app.)
  reactStrictMode: true, // Next.js option list: reactStrictMode :contentReference[oaicite:0]{index=0}

  // Removes "X-Powered-By: Next.js" header (minor security/cleanliness).
  poweredByHeader: false, // poweredByHeader :contentReference[oaicite:1]{index=1}

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

    // These are great, but enable when you’re ready to enforce them:
    // typedRoutes: true, // typedRoutes :contentReference[oaicite:6]{index=6}
    // reactCompiler: true, // reactCompiler :contentReference[oaicite:7]{index=7}
  },
};

export default nextConfig;
