'use client'
import { useEffect, useState } from 'react'
import { supabase, Product } from '@/lib/supabase'
import { getDistSession } from '@/lib/auth'

export default function CatalogPage() {
  const distId = getDistSession()?.distributorId
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [form, setForm] = useState({ name:'', sku_code:'', category:'', price:'', mrp:'', stock_quantity:'', unit:'Piece' })

  const fetchProducts = async () => {
    if (!distId) return
    const { data } = await supabase.from('products').select('*').eq('distributor_id', distId).order('category')
    if (data) setProducts(data)
    setLoading(false)
  }
  useEffect(() => { fetchProducts() }, [distId])

  const toggle = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
  }

  const addProduct = async () => {
    setError('')
    if (!form.name.trim()) { setError('Product ka naam zaroori hai.'); return }
    if (!form.price)       { setError('Price daalna zaroori hai.'); return }
    if (!distId)           return
    setSaving(true)
    const { error: err } = await supabase.from('products').insert({
      name: form.name.trim(), sku_code: form.sku_code.trim().toUpperCase(),
      category: form.category.trim(), price: parseFloat(form.price),
      mrp: parseFloat(form.mrp) || parseFloat(form.price),
      stock_quantity: parseInt(form.stock_quantity) || 0,
      unit: form.unit, is_active: true, distributor_id: distId,
    })
    setSaving(false)
    if (err) { setError('Save nahi ho saka: ' + err.message); return }
    setShowAdd(false)
    setForm({ name:'', sku_code:'', category:'', price:'', mrp:'', stock_quantity:'', unit:'Piece' })
    fetchProducts()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#a8a29e' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Product Catalog</h1>
          <p style={{ color: '#78716c', fontSize: 13, margin: '4px 0 0' }}>{products.filter(p => p.is_active).length} active · {products.filter(p => !p.is_active).length} hidden</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Product Add Karein</button>
      </div>

      {products.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>🗂️</div>
          <h3 style={{ fontWeight: 700, margin: '0 0 8px' }}>Catalog khali hai</h3>
          <p style={{ color: '#a8a29e', fontSize: 13, marginBottom: 16 }}>Products add karein — retailers inhe app mein dekh kar order karenge</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Pehla Product Add Karein</button>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: 16, opacity: p.is_active ? 1 : 0.5, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, right: 12, cursor: 'pointer' }} onClick={() => toggle(p)}>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: p.is_active ? '#ea580c' : '#d4cfc8', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: p.is_active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </div>
              </div>
              <p style={{ fontSize: 24, marginBottom: 10 }}>📦</p>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, paddingRight: 40 }}>{p.name}</p>
              <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#a8a29e', marginBottom: 8 }}>{p.sku_code} · {p.category}</p>
              <p style={{ margin: 0, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#c2410c' }}>₹{p.price}</span>
                <span style={{ fontSize: 11, color: '#a8a29e', textDecoration: 'line-through', marginLeft: 6 }}>₹{p.mrp}</span>
              </p>
              <p style={{ fontSize: 11, color: p.stock_quantity === 0 ? '#dc2626' : '#a8a29e', fontWeight: p.stock_quantity === 0 ? 700 : 400, margin: 0 }}>
                {p.stock_quantity === 0 ? '⚠️ Stock nahi hai' : `${p.stock_quantity} ${p.unit} available`}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-bg" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 style={{ margin: 0, fontWeight: 700 }}>Product Add Karein</h3>
              <button onClick={() => setShowAdd(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f4', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 13, color: '#b91c1c' }}>⚠️ {error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Product ka Naam *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="jaise: Surf Excel 1kg" />
                </div>
                {[['SKU Code','sku_code','text','SE1KG'],['Category','category','text','Detergent'],['Price (₹) *','price','number','185'],['MRP (₹)','mrp','number','210'],['Stock Qty','stock_quantity','number','240']].map(([l,k,t,ph]) => (
                  <div key={k}>
                    <label className="label">{l}</label>
                    <input className="input" type={t} value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {['Piece','Packet','Bottle','Box','Kg','Litre','Pack','Strip'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addProduct} disabled={saving}>{saving ? 'Save ho raha hai...' : 'Add Karein'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
