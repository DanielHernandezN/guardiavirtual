import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad — Guardia Virtual
 * ───────────────────────────────────────
 * La aplicación sirve documentos oficiales: conviene impedir que se
 * embelan en un iframe (clickjacking) y restringir el origen de los
 * recursos.
 */
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: cabecerasSeguridad,
      },
    ];
  },
};

export default nextConfig;
