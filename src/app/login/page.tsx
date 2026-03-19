'use client'
import { useState, useEffect } from 'react'
import { loginDistributor, getDistSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => { if (getDistSession()) router.replace('/dashboard') }, [router])

  const handleLogin = async () => {
    if (!phone || !password) { setError('Phone number aur password dono zaroori hain.'); return }
    if (phone.length < 10) { setError('Valid 10-digit phone number daalen.'); return }
    setLoading(true); setError('')
    const { session, error: err } = await loginDistributor(phone, password)
    setLoading(false)
    if (err) { setError(err); return }
    if (session) router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 60%, #fef3c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: '#ea580c', borderRadius: 16, marginBottom: 12, boxShadow: '0 4px 14px rgba(234,88,12,0.4)' }}>
            <span style={{ color: 'white', fontSize: 28, fontWeight: 900 }}>O</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1c1917', margin: 0 }}>Order<span style={{ color: '#ea580c' }}>Pe</span></h1>
          <p style={{ color: '#78716c', fontSize: 14, marginTop: 4 }}>Distributor Dashboard</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e7e5e4', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Dashboard Login</h2>
          <p style={{ color: '#78716c', fontSize: 14, margin: '0 0 24px' }}>Apne registered phone se login karein</p>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Phone Number</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#57534e' }}>+91</span>
              <input className="input" style={{ flex: 1 }} type="tel" placeholder="9876543210" value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} maxLength={10} autoFocus />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8 }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
            {loading ? '⏳ Login ho raha hai...' : 'Login Karein →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: 13, color: '#a8a29e' }}>
            Retailer hain?{' '}
            <a href="/shop/login" style={{ color: '#ea580c', fontWeight: 600 }}>Retailer app →</a>
          </p>
        </div>
      </div>
    </div>
  )
}
