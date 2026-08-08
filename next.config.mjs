/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The old static site lived at these paths. Keep them working so any link
  // already shared points somewhere real.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/comecar.html', destination: '/comecar', permanent: true },
      { source: '/onboarding/sucesso.html', destination: '/onboarding/sucesso', permanent: true }
    ];
  },

  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      }
    ];

    return [
      { source: '/:path*', headers: securityHeaders },
      // The dashboard and the API must never be cached by a CDN or a browser —
      // they are per-admin and contain live data.
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/dashboard/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] }
    ];
  }
};

export default nextConfig;
