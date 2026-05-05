import './globals.css';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '../lib/auth-context';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata = {
  title: 'MPS Project Manager',
  description: 'Mahawar Prefab Solutions â€” PEB Project Manager',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <body data-density="comfortable">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}