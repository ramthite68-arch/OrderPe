'use client'
import { useEffect, useState } from 'react'
import { supabase, Retailer } from '@/lib/supabase'
import { getDistSession } from '@/lib/auth'

export default function RetailersPage() {
  const session  = getDistSession()
  const distId   = session?.distributorId
  const distName = session?.distributorName || 'OrderPe'
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [form, setForm] = useState({ name: '', owner_name: '', phone: '', area: '', pin: '1234' })

  const fetchRetailers = async () => {
    if (!distId) return
    const { data } = await supabase.from('retailers').select('*')
      .eq('distributor_id', distId).order('created_at', { ascending: false })
    if (data) setRetailers(data)
    setLoading(false)
  }
  useEffect(() => { fetchRetailers() }, [distId])

  const addRetailer = async () => {
    setError('')
    if (!form.name.trim())        { setError('Dukaan ka naam zaroori hai.'); return }
    if (form.phone.length < 10)   { setError('Valid 10-digit WhatsApp number daalen.'); return }
    if (!/^\d{4}$/.test(form.pin)){ setError('PIN exactly 4 digits ka hona chahiye.'); return }
    if (!distId)                  { setError('Login expired. Dobara login karein.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('retailers').insert({
      name: form.name.trim(), owner_name: form.owner_name.trim(),
      phone: form.phone.trim(), area: form.area.trim(), pin: form.pin,
      outstanding_balance: 0, credit_limit: 10000, is_active: true, distributor_id: distId,
    })
    setSaving(false)
    if (err) {
      if (err.message.includes('duplicate')) setError('Yeh phone number pehle se registered hai.')
      else setError('Save nahi ho saka: ' + err.message)
      return
    }
    setShowAdd(false)
    setForm({ name: '', owner_name: '', phone: '', area: '', pin: '1234' })
    fetchRetailers()
  }

  const sendAppLink = (r: any) => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin + '/shop/login' : 'https://your-app.vercel.app/shop/login'
    const msg = `Namaste ${r.owner_name || r.name} ji! 🙏\n\nAb aap *OrderPe* app se 24/7 order place kar sakte hain!\n\n📱 *App Link:* ${appUrl}\n\n🔐 *Login:*\nPhone: ${r.phone}\nPIN: ${r.pin || '1234'}\n\n_${distName}_`
    window.open(`https://wa.me/91${r.phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendReminder = (r: Retailer) => {
    const msg = `Namaste ${r.owner_name || r.name} ji,\n\nAapka outstanding ₹${r.outstanding_balance.toLocaleString()} pending hai. Please clear kar dijiye.\n\n_${distName}_`
    window.open(`https://wa.me/91${r.phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#a8a29e' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Retailers</h1>
          <p style={{ color: '#78716c', fontSize: 13, margin: '4px 0 0' }}>
            {retailers.filter(r => r.is_active).length} active · Outstanding: <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{retailers.reduce((s, r) => s + r.outstanding_balance, 0).toLocaleString()}</span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Retailer Onboard Karein</button>
      </div>

      <div className="card">
        {retailers.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>👥</div>
            <h3 style={{ fontWeight: 700, margin: '0 0 8px' }}>Koi retailer nahi hai</h3>
            <p style={{ color: '#a8a29e', fontSize: 13, marginBottom: 16 }}>Retailers ko onboard karein aur unhe app ka link bhejein</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Pehla Retailer Add Karein</button>
          </div>
        ) : retailers.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f5f5f4' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#c2410c', flexShrink: 0 }}>{r.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>{r.name}</p>
              <p style={{ fontSize: 12, color: '#a8a29e', margin: 0 }}>{r.owner_name} · {r.area} · {r.phone}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0, color: r.outstanding_balance === 0 ? '#15803d' : '#dc2626' }}>
                {r.outstanding_balance === 0 ? '✓ Clear' : `₹${r.outstanding_balance.toLocaleString()}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-wa btn-sm" onClick={() => sendAppLink(r)}>📱 App Bhejein</button>
              {r.outstanding_balance > 0 && <button className="btn btn-sm" onClick={() => sendReminder(r)}>💬 Reminder</button>}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Retailer Onboard Karein</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#78716c' }}>Add karne ke baad app link WhatsApp pe bhejein</p>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f4', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
                📱 Add karne ke baad <strong>"App Bhejein"</strong> se retailer ko WhatsApp pe link + PIN bhejein.
              </div>
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 13, color: '#b91c1c' }}>⚠️ {error}</div>}
              {[['Dukaan ka Naam *','name','text'],['Owner ka Naam','owner_name','text'],['WhatsApp Number *','phone','tel'],['Area / Mohalla','area','text']].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label className="label">{label}</label>
                  <input className="input" type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => { setError(''); setForm(f => ({ ...f, [key]: e.target.value })) }}
                    maxLength={key === 'phone' ? 10 : undefined} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label className="label">4-Digit PIN * <span style={{ fontWeight: 400, textTransform: 'none', color: '#a8a29e' }}>(retailer login ke liye)</span></label>
                <input className="input" type="tel" inputMode="numeric" maxLength={4} placeholder="1234"
                  style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: '0.5em', textAlign: 'center' }}
                  value={form.pin}
                  onChange={e => { setError(''); setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') })) }} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addRetailer} disabled={saving}>{saving ? '⏳ Saving...' : 'Retailer Add Karein'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
