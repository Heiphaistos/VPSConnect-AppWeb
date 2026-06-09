import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VPSConnect — heiphaistos.org',
  description: 'Server monitoring dashboard',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-base-950 scanline">
        {children}
      </body>
    </html>
  )
}
