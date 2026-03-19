'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getDistSession, clearDistSession, DistSession } from '@/lib/auth'

const NAV = [
  { href: '/dashboard',           icon: '📋', label: 'Orders'    },
  { href: '/dashboard/whatsapp',  icon: '💬', label: 'WhatsApp'  },
  { href: '/dashboard/catalog',   icon: '🗂️',  label: 'Catalog'  },
  { href: '/dashboard/retailers', icon: '👥', label: 'Retailers' },
  { href: '/dashboard/schemes',   icon: '🏷️',  label: 'Schemes'  },
  { href: '/dashboard/analytics', icon: '📊', label: 'Analytics' },
  { href: '/dashboard/salesman',  icon: '🧑‍💼', label: 'Salesmen' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<DistSession | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = getDistSession()
    if (!s) { router.replace('/login'); return }
    setSession(s); setReady(true)
  }, [router])

  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #ea580c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#78716c', fontSize: 14 }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TOPBAR */}
      <header style={{ height: 56, background: 'white', borderBottom: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: '#ea580c', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 14 }}>O</span>
          </div>
          <span style={{ fontWeight: 900, fontSize: 16, color: '#1c1917' }}>Order<span style={{ color: '#ea580c' }}>Pe</span></span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>{session?.distributorName}</div>
          <div style={{ fontSize: 11, color: '#a8a29e' }}>{session?.area}</div>
        </div>
        <button onClick={() => { clearDistSession(); router.replace('/login') }}
          className="btn btn-ghost btn-sm" style={{ border: '1px solid #e7e5e4' }}>
          🚪 Logout
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <aside style={{ width: 220, background: 'white', borderRight: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column', padding: '16px 12px', position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 8 }}>Main Menu</p>
          {NAV.slice(0, 5).map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 12, fontSize: 13, marginBottom: 2,
              textDecoration: 'none', transition: 'all 0.1s',
              background: pathname === item.href ? '#fff7ed' : 'transparent',
              color: pathname === item.href ? '#c2410c' : '#78716c',
              fontWeight: pathname === item.href ? 700 : 500,
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #f5f5f4', margin: '12px 0' }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 8 }}>Reports</p>
          <Link href={NAV[5].href} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, fontSize: 13, marginBottom: 2, textDecoration: 'none',
            background: pathname === NAV[5].href ? '#fff7ed' : 'transparent',
            color: pathname === NAV[5].href ? '#c2410c' : '#78716c',
            fontWeight: pathname === NAV[5].href ? 700 : 500,
          }}>
            <span style={{ fontSize: 16 }}>{NAV[5].icon}</span>{NAV[5].label}
          </Link>
          <div style={{ borderTop: '1px solid #f5f5f4', margin: '12px 0' }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 8 }}>Team</p>
          <Link href={NAV[6].href} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, fontSize: 13, marginBottom: 2, textDecoration: 'none',
            background: pathname === NAV[6].href ? '#fff7ed' : 'transparent',
            color: pathname === NAV[6].href ? '#c2410c' : '#78716c',
            fontWeight: pathname === NAV[6].href ? 700 : 500,
          }}>
            <span style={{ fontSize: 16 }}>{NAV[6].icon}</span>{NAV[6].label}
          </Link>
          <div style={{ marginTop: 'auto', borderTop: '1px solid #f5f5f4', paddingTop: 12 }}>
            <div style={{ background: '#fff7ed', borderRadius: 12, padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#ea580c', margin: '0 0 2px' }}>LOGGED IN AS</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', margin: 0 }}>{session?.distributorName}</p>
              <p style={{ fontSize: 11, color: '#a8a29e', margin: 0 }}>{session?.phone}</p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto', background: '#fafaf9' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
