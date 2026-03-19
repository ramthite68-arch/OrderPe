'use client'
import { useState, useRef, useEffect } from 'react'
import { loginRetailer, getRetSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function RetailerLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'pin'>('phone')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => { if (getRetSession()) router.replace('/shop/catalog') }, [router])

  const goToPin = () => {
    if (phone.length < 10) { setError('Valid 10-digit number daalen.'); return }
    setError(''); setStep('pin')
    setTimeout(() => pinRefs[0].current?.focus(), 100)
  }

  const handlePinInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...pin]; next[idx] = val.slice(-1); setPin(next); setError('')
    if (val && idx < 3) pinRefs[idx + 1].current?.focus()
    if (next.every(d => d) && idx === 3) doLogin(next.join(''))
  }

  const handleKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) pinRefs[idx - 1].current?.focus()
  }

  const doLogin = async (pinStr: string) => {
    setLoading(true); setError('')
    const { session, error: err } = await loginRetailer(phone, pinStr)
    setLoading(false)
    if (err) { setError(err); setPin(['', '', '', '']); setTimeout(() => pinRefs[0].current?.focus(), 100); return }
    if (session) router.replace('/shop/catalog')
  }

  const spinStyle = `@keyframes spin { to { transform: rotate(360deg); } }`

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #fff7ed 0%, #fafaf9 60%, #fef3c7 100%)' }}>
      <style>{spinStyle}</style>
      <div style={{ padding: '56px 24px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: '#ea580c', borderRadius: 16, marginBottom: 12, boxShadow: '0 4px 14px rgba(234,88,12,0.35)' }}>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 24 }}>O</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#1c1917' }}>Order<span style={{ color: '#ea580c' }}>Pe</span></h1>
        <p style={{ color: '#a8a29e', fontSize: 12, margin: '4px 0 0' }}>Retailer Ordering App</p>
      </div>

      <div style={{ flex: 1, padding: '8px 24px 24px' }}>
        {step === 'phone' ? (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>Namaste! 👋</h2>
            <p style={{ color: '#78716c', fontSize: 14, margin: '0 0 24px' }}>Apna registered mobile number daalen</p>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Mobile Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#57534e', flexShrink: 0 }}>+91</div>
                <input type="tel" inputMode="numeric" maxLength={10}
                  style={{ flex: 1, padding: '12px 14px', border: '2px solid #e7e5e4', borderRadius: 12, fontSize: 16, background: 'white', outline: 'none', fontFamily: 'inherit' }}
                  placeholder="9876543210" value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && goToPin()}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#ea580c'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#e7e5e4'}
                  autoFocus />
              </div>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8 }}><span>⚠️</span><span>{error}</span></div>}
            <button onClick={goToPin}
              style={{ width: '100%', padding: '14px', background: '#ea580c', color: 'white', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(234,88,12,0.35)' }}>
              Aage Badhein →
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#a8a29e', marginTop: 16 }}>
              Registered nahi hain? Apne distributor se contact karein.
            </p>
          </div>
        ) : (
          <div>
            <button onClick={() => { setStep('phone'); setPin(['', '', '', '']); setError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#78716c', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, fontFamily: 'inherit' }}>
              ← Wapas
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>PIN Daalen 🔐</h2>
            <p style={{ color: '#78716c', fontSize: 13, margin: '0 0 4px' }}>Aapke distributor ne aapko PIN bheja hoga</p>
            <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 24px' }}>+91 {phone}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              {pin.map((digit, idx) => (
                <input key={idx} ref={pinRefs[idx]}
                  type="tel" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handlePinInput(idx, e.target.value)}
                  onKeyDown={e => handleKey(idx, e)}
                  style={{
                    width: 60, height: 60, textAlign: 'center', fontSize: 28, fontWeight: 900,
                    border: `2px solid ${digit ? '#ea580c' : '#e7e5e4'}`,
                    borderRadius: 16, background: 'white', outline: 'none',
                    color: digit ? '#ea580c' : '#1c1917', fontFamily: 'inherit',
                    boxShadow: digit ? '0 0 0 3px rgba(234,88,12,0.1)' : 'none',
                  }} />
              ))}
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 8 }}><span>⚠️</span><span>{error}</span></div>}
            <button onClick={() => doLogin(pin.join(''))} disabled={loading || pin.some(d => !d)}
              style={{ width: '100%', padding: 14, background: loading || pin.some(d => !d) ? '#d4cfc8' : '#ea580c', color: 'white', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 900, cursor: loading || pin.some(d => !d) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              {loading ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Login ho raha hai...</> : 'App Mein Jaayein →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#a8a29e', marginTop: 16 }}>PIN bhool gaye? Apne distributor se reset karwayein.</p>
          </div>
        )}
      </div>
    </div>
  )
}
