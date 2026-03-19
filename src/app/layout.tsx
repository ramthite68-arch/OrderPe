import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OrderPe — B2B Ordering Platform',
  description: 'Digital ordering system for FMCG distributors and retailers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
