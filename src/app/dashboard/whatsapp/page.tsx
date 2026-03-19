'use client'
import { useState, useEffect } from 'react'
import { supabase, Product } from '@/lib/supabase'
import { getDistSession } from '@/lib/auth'
import { parseWhatsAppOrder, ParseResult } from '@/lib/parser'

export default function WhatsAppPage() {
  const distId = getDistSession()?.distributorId
  const [products,  setProducts]  = useState<Product[]>([])
  const [retailers, setRetailers] = useState<{ id: string; name: string }[]>([])
  const [msg,       setMsg]       = useState('')
  const [retailer,  setRetailer]  = useState('')
  const [result,    setResult]    = useState<ParseResult | null>(null)
  const [creating,  setCreating]  = useState(false)
  const [created,   setCreated]   = useState(false)

  useEffect(() => {
    if (!distId) return
    supabase.from('products').select('*').eq('is_active', true).eq('distributor_id', distId).then(({ data }) => { if (data) setProducts(data) })
    supabase.from('retailers').select('id,name').eq('distributor_id', distId).then(({ data }) => {
      if (data && data.length > 0) { setRetailers(data); setRetailer(data[0].id) }
    })
  }, [distId])

  const handleCreate = async () => {
    if (!result || result.matched.length === 0 || !distId || !retailer) return
    setCreating(true)
    const total = result.matched.reduce((s, m) => s + m.qty * m.product.price, 0)
    const { data: ord, error } = await supabase.from('orders').insert({
      retailer_id: retailer, distributor_id: distId,
      status: 'pending', order_source: 'whatsapp', total_amount: total, notes: msg,
    }).select().single()
    if (!error && ord) {
      await supabase.from('order_items').insert(result.matched.map(m => ({
        order_id: ord.id, product_id: m.product.id, quantity: m.qty, unit_price: m.product.price
      })))
      setCreated(true)
    }
    setCreating(false)
  }

  const SAMPLES = [
    { label: 'SKU codes', msg: 'SE1KG 5, COL200 10 bhej do bhai\nDET200 6\nAmul butter 4' },
    { label: 'Product names', msg: 'bhai surf excel 5 packet chahiye\naur colgate 10\ndettol 6 bottle' },
    { label: 'Hinglish', msg: 'SE1KG - 5\nColgate 200g - 10\nDettol - 6\namul butter 4 dena' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>💬 WhatsApp Order Parser</h1>
        <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>Retailer ka WhatsApp message paste karein — system khud order ban dega</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {SAMPLES.map(s => (
              <button key={s.label} onClick={() => { setMsg(s.msg); setResult(null); setCreated(false) }}
                className="btn btn-sm">{s.label} try karein</button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Kisne bheja yeh message?</label>
            <select className="input" value={retailer} onChange={e => setRetailer(e.target.value)}>
              {retailers.length === 0 ? <option>Pehle retailers add karein</option> : retailers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">WhatsApp message yahan paste karein</label>
            <textarea className="input" style={{ height: 140, resize: 'none', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              value={msg} placeholder={'SE1KG 5, COL200 10\nbhai dettol 6 bhej do\nAmul butter 4'}
              onChange={e => { setMsg(e.target.value); setResult(null); setCreated(false) }} />
          </div>
          <div style={{ background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: '#78716c', lineHeight: 1.8 }}>
            <strong style={{ color: '#1c1917' }}>✅ Supported formats:</strong><br />
            SE1KG 5 → SKU se · Surf Excel 5 → naam se · Hindi/Hinglish ignore ho jaata hai
          </div>
          <button onClick={() => { setResult(parseWhatsAppOrder(msg, products)); setCreated(false) }}
            className="btn btn-wa" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            🔍 Message Parse Karein
          </button>
        </div>

        <div>
          {!result ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>💬</div>
              <p style={{ color: '#a8a29e', fontSize: 14 }}>Message parse karein</p>
            </div>
          ) : (
            <div className="card">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f4', background: '#fafaf9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{result.matched.length > 0 ? `✅ ${result.matched.length} items mili` : '❌ Koi item nahi mili'}</span>
                {result.unmatched.length > 0 && <span style={{ fontSize: 11, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 8px' }}>{result.unmatched.length} unclear</span>}
              </div>
              {result.matched.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f5f5f4' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.product.name}</p>
                    <p style={{ fontSize: 10, color: '#a8a29e', fontFamily: 'monospace', margin: 0 }}>{m.product.sku_code}</p>
                  </div>
                  <span style={{ background: '#fff7ed', color: '#c2410c', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>×{m.qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 900 }}>₹{(m.qty * m.product.price).toLocaleString()}</span>
                </div>
              ))}
              {result.unmatched.length > 0 && (
                <div style={{ padding: '10px 16px', background: '#fffbeb', fontSize: 12, color: '#b45309' }}>⚠️ Samajh nahi aaya: {result.unmatched.join(', ')}</div>
              )}
              {result.matched.length > 0 && (
                <>
                  <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, background: '#fafaf9', borderTop: '1px solid #f5f5f4' }}>
                    <span>Total</span><span style={{ color: '#c2410c' }}>₹{result.matched.reduce((s, m) => s + m.qty * m.product.price, 0).toLocaleString()}</span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {created ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12, fontSize: 13, color: '#15803d' }}>
                        ✅ Order ban gaya! Orders tab mein dekhen aur confirm karein.
                      </div>
                    ) : (
                      <button onClick={handleCreate} disabled={creating || !retailer} className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                        {creating ? '⏳ Order ban raha hai...' : '✅ Order Banao → Dashboard mein Add Karo'}
                      </button>
                    )}
                    <button className="btn" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => { setResult(null); setMsg(''); setCreated(false) }}>
                      🔄 Naya Message Parse Karein
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
