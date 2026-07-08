import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  async redirects() {
    // Legal pages are the original static files in public/
    return [
      { source: '/privacy', destination: '/privacy.html', permanent: false },
      { source: '/terms', destination: '/terms.html', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // DENY blocks iframe embedding — skipped in dev so the local
          // preview panel (which renders the app in an iframe) can load it
          ...(isDev ? [] : [{ key: 'X-Frame-Options', value: 'DENY' }]),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://clerk.accounts.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co https://clerk.accounts.dev https://*.clerk.accounts.dev https://api.razorpay.com https://challenges.cloudflare.com",
              "frame-src https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
