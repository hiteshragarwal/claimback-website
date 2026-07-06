import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClaimBack — Fight Your Health Insurance Rejection',
  description: 'AI reads your rejection letter, checks IRDAI law, drafts your appeal in 3 minutes.',
  metadataBase: new URL('https://claimback.co.in'),
  openGraph: {
    title: 'ClaimBack',
    description: 'India\'s first AI-powered health insurance appeal platform.',
    url: 'https://claimback.co.in',
    siteName: 'ClaimBack',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: { fontFamily: "'DM Sans', sans-serif", fontSize: '14px' },
              success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
