'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, Order, Product, Retailer } from '@/lib/supabase'
import { getDistSession } from '@/lib/auth'
import { generateTallyXML, downloadXML, generateWhatsAppInvoice } from '@/lib/tally'

const NEXT_STATUS: Record<string, string> = { pending: 'confirmed', confirmed: 'dispatched', dispatched: 'delivered' }
const NEXT_LABEL: Record<string, string> = {
  pending: '✅ Confirm Order',
  confirmed: '🚚 Mark Dispatched',
  dispatched: '📦 Mark Delivered',
}

const badgeStyle = (status: string) => {
  const styles: Record<string, React.CSSProperties> = {
    pending:    { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
    confirmed:  { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    dispatched: { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' },
    delivered:  { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  }
  return { ...styles[status], display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }
}

const sourceBadge = (source: string) => {
  if (source === 'whatsapp') return <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>💬 WA</span>
  if (source === 'manual')   return <span style={{ background: '#f5f5f4', color: '#57534e', border: '1px solid #e7e5e4', display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✏️ Manual</span>
  return <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>📱 App</span>
}

export default function OrdersPage() {
  const distId   = getDistSession()?.distributorId
  const distName = getDistSession()?.distributorName || 'OrderPe'
  const [orders,     setOrders]     = useState<Order[]>([])
  const [retailers,  setRetailers]  = useState<Retailer[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<Order | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [mRet,   setMRet]   = useState('')
  const [mItems, setMItems] = useState<{ pid: string; qty: number; price: number; name: string }[]>([])
  const [mNote,  setMNote]  = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!distId) return
    const { data } = await supabase
      .from('orders')
      .select('*, retailer:retailers(id,name,phone,area,outstanding_balance), order_items(*, product:products(name,sku_code))')
      .eq('distributor_id', distId)
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
    setLoading(false)
  }, [distId])

  useEffect(() => {
    if (!distId) return
    fetchOrders()
    supabase.from('retailers').select('*').eq('distributor_id', distId).then(({ data }) => { if (data) setRetailers(data) })
    supabase.from('products').select('*').eq('distributor_id', distId).eq('is_active', true).then(({ data }) => { if (data) setProducts(data) })
    const ch = supabase.channel('orders-' + distId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [distId, fetchOrders])

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search && !o.retailer?.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const revenue = orders.filter(o => o.status !== 'pending').reduce((s, o) => s + o.total_amount, 0)

  const advanceOrder = async (order: Order) => {
    const next = NEXT_STATUS[order.status]; if (!next) return
    const now = new Date().toISOString()
    const upd: Record<string, string> = { status: next }
    if (next === 'confirmed')  upd.confirmed_at  = now
    if (next === 'dispatched') upd.dispatched_at = now
    if (next === 'delivered')  upd.delivered_at  = now
    await supabase.from('orders').update(upd).eq('id', order.id)
    fetchOrders()
    setSelected(p => p?.id === order.id ? { ...p, ...upd, status: next as Order['status'] } : p)
  }

  const addItem = (pid: string) => {
    const p = products.find(x => x.id === pid); if (!p) return
    setMItems(prev => {
      const e = prev.find(x => x.pid === pid)
      return e ? prev.map(x => x.pid === pid ? { ...x, qty: x.qty + 1 } : x)
               : [...prev, { pid, qty: 1, price: p.price, name: p.name }]
    })
  }
  const updQty = (pid: string, qty: number) => {
    if (qty <= 0) setMItems(p => p.filter(x => x.pid !== pid))
    else setMItems(p => p.map(x => x.pid === pid ? { ...x, qty } : x))
  }
  const mTotal = mItems.reduce((s, x) => s + x.qty * x.price, 0)

  const saveManual = async () => {
    if (!mRet || mItems.length === 0 || !distId) return
    setSaving(true)
    const { data: ord, error } = await supabase.from('orders').insert({
      retailer_id: mRet, distributor_id: distId, status: 'confirmed',
      order_source: 'manual', total_amount: mTotal, notes: mNote || null,
    }).select().single()
    if (!error && ord) {
      await supabase.from('order_items').insert(mItems.map(x => ({ order_id: ord.id, product_id: x.pid, quantity: x.qty, unit_price: x.price })))
      setShowManual(false); setMItems([]); setMRet(''); setMNote('')
      fetchOrders()
    }
    setSaving(false)
  }

  const steps = ['pending', 'confirmed', 'dispatched', 'delivered']
  const stepLabels = ['Order Aaya', 'Confirmed', 'Dispatched', 'Delivered']

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #ea580c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#78716c', fontSize: 14 }}>Orders load ho rahe hain...</p>
    </div>
  )

  return (
    <div>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Orders</h1>
          <p style={{ color: '#78716c', fontSize: 13, margin: '4px 0 0' }}>Confirm, dispatch aur deliver karein</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowManual(true)} className="btn btn-primary">+ Manual Order</button>
          <button onClick={() => downloadXML(generateTallyXML(orders), `tally-${new Date().toISOString().slice(0, 10)}.xml`)} className="btn">⬇ Tally Export</button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { v: pendingCount, l: 'Pending Orders', c: '#b45309', bg: '#fffbeb', icon: '⏳' },
          { v: `₹${revenue.toLocaleString()}`, l: 'Total Revenue', c: '#c2410c', bg: '#fff7ed', icon: '💰' },
          { v: orders.filter(o => o.order_source === 'app').length, l: 'App Orders', c: '#1d4ed8', bg: '#eff6ff', icon: '📱' },
          { v: orders.filter(o => o.order_source === 'whatsapp').length, l: 'WhatsApp Orders', c: '#15803d', bg: '#f0fdf4', icon: '💬' },
        ].map((x, i) => (
          <div key={i} className="stat-card">
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: x.bg, borderRadius: 8, fontSize: 16, marginBottom: 8 }}>{x.icon}</div>
            <p style={{ fontSize: 24, fontWeight: 900, color: x.c, margin: '0 0 2px' }}>{x.v}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#57534e', margin: 0 }}>{x.l}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* ORDER LIST */}
        <div>
          <div className="card">
            {/* FILTERS */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f5f5f4', flexWrap: 'wrap', alignItems: 'center', background: '#fafaf9' }}>
              {['all', 'pending', 'confirmed', 'dispatched', 'delivered'].map(st => (
                <button key={st} onClick={() => setFilter(st)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.1s',
                    background: filter === st ? '#1c1917' : 'white',
                    color: filter === st ? 'white' : '#78716c',
                    boxShadow: filter === st ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                  }}>
                  {st === 'all' ? 'Sabhi' : st.charAt(0).toUpperCase() + st.slice(1)}
                  {st === 'pending' && pendingCount > 0 && (
                    <span style={{ marginLeft: 6, background: '#f59e0b', color: 'white', borderRadius: 20, padding: '0 6px', fontSize: 10 }}>{pendingCount}</span>
                  )}
                </button>
              ))}
              <input
                style={{ marginLeft: 'auto', fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 8, padding: '6px 12px', width: 180, outline: 'none', background: 'white' }}
                placeholder="🔍 Retailer search karein..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 12 }}>📋</div>
                <h3 style={{ fontWeight: 700, margin: '0 0 4px' }}>Koi order nahi mila</h3>
                <p style={{ color: '#a8a29e', fontSize: 13, marginBottom: 16 }}>Jab retailers order karenge, yahan dikhai denge</p>
                <button onClick={() => setShowManual(true)} className="btn btn-primary">+ Manual Order Add Karein</button>
              </div>
            ) : filtered.map(o => (
              <div key={o.id} onClick={() => setSelected(o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  borderBottom: '1px solid #f5f5f4', cursor: 'pointer', transition: 'background 0.1s',
                  background: selected?.id === o.id ? '#fff7ed' : 'white',
                  borderLeft: selected?.id === o.id ? '3px solid #ea580c' : '3px solid transparent',
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{o.retailer?.name}</p>
                    <span style={badgeStyle(o.status)}>{o.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#a8a29e', fontFamily: 'monospace' }}>{o.id.slice(-8)}</span>
                    <span style={{ fontSize: 11, color: '#a8a29e' }}>·</span>
                    <span style={{ fontSize: 11, color: '#a8a29e' }}>{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {sourceBadge(o.order_source)}
                  </div>
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, margin: 0, flexShrink: 0 }}>₹{o.total_amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div>
          {!selected ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, minHeight: 300 }}>
              <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>👈</div>
              <p style={{ color: '#a8a29e', fontSize: 14, margin: 0 }}>Koi order select karein</p>
            </div>
          ) : (
            <div className="card">
              {/* HEADER */}
              <div style={{ padding: 16, borderBottom: '1px solid #f5f5f4', background: '#fafaf9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{selected.retailer?.name}</h3>
                  <span style={badgeStyle(selected.status)}>{selected.status}</span>
                </div>
                <p style={{ fontSize: 12, color: '#a8a29e', margin: '0 0 4px' }}>{selected.retailer?.area} · {selected.retailer?.phone}</p>
                <p style={{ fontSize: 10, color: '#a8a29e', fontFamily: 'monospace', margin: 0 }}>{selected.id}</p>
              </div>

              {/* STEPPER */}
              <div style={{ padding: '16px', borderBottom: '1px solid #f5f5f4' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {steps.map((st, i) => {
                    const cur = steps.indexOf(selected.status)
                    return (
                      <div key={st} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, border: '2px solid',
                            background: i < cur ? '#ea580c' : i === cur ? 'white' : 'white',
                            borderColor: i <= cur ? '#ea580c' : '#e7e5e4',
                            color: i < cur ? 'white' : i === cur ? '#ea580c' : '#d4cfc8',
                          }}>
                            {i < cur ? '✓' : i + 1}
                          </div>
                          <p style={{ fontSize: 9, marginTop: 4, fontWeight: 600, color: i <= cur ? '#c2410c' : '#d4cfc8' }}>{stepLabels[i]}</p>
                        </div>
                        {i < steps.length - 1 && (
                          <div style={{ height: 2, flex: 1, background: i < cur ? '#ea580c' : '#e7e5e4', marginBottom: 16, marginLeft: 4, marginRight: 4 }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* NOTE */}
              {selected.notes && (
                <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #f5f5f4' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                    {selected.order_source === 'manual' ? '📝 Note' : '💬 WhatsApp Message'}
                  </p>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', background: 'white', border: '1px solid #fde68a', borderRadius: 8, padding: 10, margin: 0, lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}

              {/* ITEMS */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f4' }}>
                {selected.order_items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < (selected.order_items?.length || 0) - 1 ? '1px dashed #f5f5f4' : 'none' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.product?.name}</span>
                    <span style={{ fontSize: 11, background: '#f5f5f4', borderRadius: 6, padding: '2px 8px', color: '#57534e' }}>×{item.quantity}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>₹{(item.line_total || item.quantity * item.unit_price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* TOTAL */}
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, borderBottom: '1px solid #f5f5f4', background: '#fafaf9' }}>
                <span>Total Amount</span>
                <span style={{ color: '#c2410c' }}>₹{selected.total_amount.toLocaleString()}</span>
              </div>

              {/* ACTIONS */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {NEXT_STATUS[selected.status] && (
                  <button onClick={() => advanceOrder(selected)} className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    {NEXT_LABEL[selected.status]}
                  </button>
                )}
                {selected.status === 'delivered' && (
                  <>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12, fontSize: 13, color: '#15803d', textAlign: 'center' }}>
                      🎉 Order successfully delivered!
                    </div>
                    <button onClick={() => {
                      const msg = generateWhatsAppInvoice(selected, distName)
                      window.open(`https://wa.me/91${selected.retailer?.phone}?text=${encodeURIComponent(msg)}`, '_blank')
                    }} className="btn btn-wa" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                      🧾 WhatsApp pe Invoice Bhejein
                    </button>
                  </>
                )}
                <button onClick={() => {
                  const msg = `Order ${selected.id} ka status: *${selected.status}*\n\nDhanyawad! 🙏\n_${distName}_`
                  window.open(`https://wa.me/91${selected.retailer?.phone}?text=${encodeURIComponent(msg)}`, '_blank')
                }} className="btn btn-wa" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                  💬 WhatsApp Update Bhejein
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MANUAL ORDER MODAL */}
      {showManual && (
        <div className="modal-bg" onClick={() => setShowManual(false)}>
          <div className="modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>✏️ Manual Order Add Karein</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#78716c' }}>Phone pe liya hua order yahan add karein</p>
              </div>
              <button onClick={() => setShowManual(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f4', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Retailer Chunein *</label>
                <select className="input" value={mRet} onChange={e => setMRet(e.target.value)}>
                  <option value="">-- Retailer chunein --</option>
                  {retailers.map(r => <option key={r.id} value={r.id}>{r.name} · {r.area}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Products Chunein *</label>
                <p style={{ fontSize: 12, color: '#a8a29e', margin: '0 0 8px' }}>Product pe click karein to add ho jayega</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {products.map(p => (
                    <div key={p.id} onClick={() => addItem(p.id)}
                      style={{ border: '2px solid #e7e5e4', borderRadius: 12, padding: 10, cursor: 'pointer', transition: 'all 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ea580c'; (e.currentTarget as HTMLElement).style.background = '#fff7ed' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e7e5e4'; (e.currentTarget as HTMLElement).style.background = 'white' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>{p.name}</p>
                      <p style={{ fontSize: 10, color: '#a8a29e', fontFamily: 'monospace', margin: '0 0 4px' }}>{p.sku_code}</p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#c2410c', margin: 0 }}>₹{p.price}<span style={{ fontSize: 10, fontWeight: 400, color: '#a8a29e' }}>/{p.unit}</span></p>
                    </div>
                  ))}
                </div>
              </div>
              {mItems.length > 0 && (
                <div>
                  <label className="label">Selected Items</label>
                  <div style={{ border: '1px solid #e7e5e4', borderRadius: 12, overflow: 'hidden' }}>
                    {mItems.map(item => (
                      <div key={item.pid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #f5f5f4' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{item.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => updQty(item.pid, item.qty - 1)} style={{ width: 28, height: 28, borderRadius: 8, background: '#f5f5f4', border: 'none', cursor: 'pointer', fontWeight: 700 }}>−</button>
                          <span style={{ fontSize: 14, fontWeight: 700, width: 24, textAlign: 'center' }}>{item.qty}</span>
                          <button onClick={() => updQty(item.pid, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: 8, background: '#ea580c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 70, textAlign: 'right' }}>₹{(item.qty * item.price).toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fafaf9', fontWeight: 800 }}>
                      <span>Total</span><span style={{ color: '#c2410c' }}>₹{mTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="label">Note (Optional)</label>
                <input className="input" placeholder="e.g. Cash on delivery" value={mNote} onChange={e => setMNote(e.target.value)} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShowManual(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveManual} disabled={saving || !mRet || mItems.length === 0}>
                {saving ? 'Save ho raha hai...' : `Order Save · ₹${mTotal.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
