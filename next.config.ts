import type { NextConfig } from "next";

// Content-Security-Policy. The map engine (MapLibre) needs blob: workers and
// wasm; Protomaps glyphs are fetched from protomaps.github.io. Next.js injects
// inline bootstrap scripts, so 'unsafe-inline'/'unsafe-eval' remain in script-src
// — the other directives (no objects, no framing, locked base-uri, restricted
// connect/img/font sources) still meaningfully reduce the attack surface.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "font-src 'self' https://protomaps.github.io",
  "connect-src 'self' https://protomaps.github.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
