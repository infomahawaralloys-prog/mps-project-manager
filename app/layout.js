'use client';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>MPS Project Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Mahawar Prefab Solutions — PEB Project Manager" />
      </head>
      <body className="grid-bg">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
