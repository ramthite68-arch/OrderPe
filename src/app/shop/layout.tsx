import type { Metadata, Viewport } from 'next'
export const metadata: Metadata = {
  title: 'OrderPe — Retailer App',
  description: 'Apne distributor se seedha order karein',
}
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, themeColor: '#ea580c',
}
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#fafaf9' }}>{children}</div>
}
