'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Product, Order } from '@/lib/supabase'
import { getRetSession, clearRetSession, RetSession } from '@/lib/auth'

type CartItem = { product: Product; qty: number }
type Scheme = { id: string; name: string; description: string; tags: string; is_active: boolean }

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`

export default function RetailerApp() {
  const router = useRouter()
  const [session,  setSession]  = useState<RetSession | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders,   setOrders]   = useState<Order[]>([])
  const [schemes,  setSchemes]  = useState<Scheme[]>([])
  const [cart,     setCart]     = useState<CartItem[]>([])
  const [tab,      setTab]      = useState<'catalog' | 'cart' | 'orders' | 'account'>('catalog')
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [loading,  setLoading]  = useState(true)
  const [placing,  setPlacing]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [showInvoice, setShowInvoice] = useState<Order | null>(null)

  useEffect(() => {
    const s = getRetSession()
    if (!s) { router.replace('/shop/login'); return }
    setSession(s)
    Promise.all([
      supabase.from('products').select('*').eq('distributor_id', s.distributorId).eq('is_active', true).order('category'),
      supabase.from('orders').select('*, order_items(*, product:products(id,name,sku_code,price))').eq('retailer_id', s.retailerId).order('created_at', { ascending: false }).limit(20),
      supabase.from('schemes').select('*').eq('distributor_id', s.distributorId).eq('is_active', true),
    ]).then(([p, o, sc]) => {
      if (p.data)  setProducts(p.data)
      if (o.data)  setOrders(o.data)
      if (sc.data) setSchemes(sc.data)
      setLoading(false)
    }).catch(() => {
      // schemes table might not exist yet — still load products and orders
      Promise.all([
        supabase.from('products').select('*').eq('distributor_id', s.distributorId).eq('is_active', true).order('category'),
        supabase.from('orders').select('*, order_items(*, product:products(id,name,sku_code,price))').eq('retailer_id', s.retailerId).order('created_at', { ascending: false }).limit(20),
      ]).then(([p, o]) => {
        if (p.data) setProducts(p.data)
        if (o.data) setOrders(o.data)
        setLoading(false)
      })
    })
  }, [router])

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products])
  const filtered = products.filter(p => {
    const mc = category === 'All' || p.category === category
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku_code?.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  const addToCart = (p: Product) => setCart(prev => {
    const e = prev.find(x => x.product.id === p.id)
    return e ? prev.map(x => x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...prev, { product: p, qty: 1 }]
  })
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(p => p.filter(x => x.product.id !== id))
    else setCart(p => p.map(x => x.product.id === id ? { ...x, qty } : x))
  }
  const getQty = (id: string) => cart.find(x => x.product.id === id)?.qty || 0
  const cartTotal = cart.reduce((s, x) => s + x.qty * x.product.price, 0)
  const cartCount = cart.reduce((s, x) => s + x.qty, 0)

  const placeOrder = async () => {
    if (!session || cart.length === 0) return
    setPlacing(true)
    const { data: ord, error } = await supabase.from('orders').insert({
      retailer_id: session.retailerId, distributor_id: session.distributorId,
      status: 'pending', order_source: 'app', total_amount: cartTotal,
    }).select().single()
    if (!error && ord) {
      await supabase.from('order_items').insert(cart.map(x => ({
        order_id: ord.id, product_id: x.product.id, quantity: x.qty, unit_price: x.product.price
      })))
      setCart([]); setSuccess(true); setTab('orders')
      const { data } = await supabase.from('orders')
        .select('*, order_items(*, product:products(id,name,sku_code,price))')
        .eq('retailer_id', session.retailerId)
        .order('created_at', { ascending: false }).limit(20)
      if (data) setOrders(data)
      setTimeout(() => setSuccess(false), 5000)
    }
    setPlacing(false)
  }

  const repeatLast = () => {
    const last = orders[0]; if (!last?.order_items) return
    const nc: CartItem[] = []
    last.order_items.forEach(item => {
      const p = products.find(x => x.id === item.product_id)
      if (p) nc.push({ product: p, qty: item.quantity })
    })
    if (nc.length > 0) { setCart(nc); setTab('cart') }
  }

  // Generate and download PDF invoice
  const downloadInvoicePDF = (order: Order) => {
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const itemRows = (order.order_items || []).map(i => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f5f5f4;font-size:14px;">${i.product?.name || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f5f5f4;font-size:14px;text-align:center;">${i.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f5f5f4;font-size:14px;text-align:right;">₹${i.unit_price.toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f5f5f4;font-size:14px;text-align:right;font-weight:700;">₹${(i.line_total || i.quantity * i.unit_price).toLocaleString()}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${order.id}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#fff; color:#1c1917; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #ea580c; }
    .logo { font-size:28px; font-weight:900; color:#1c1917; }
    .logo span { color:#ea580c; }
    .logo-sub { font-size:12px; color:#78716c; margin-top:4px; }
    .invoice-info { text-align:right; }
    .invoice-info h2 { font-size:22px; font-weight:900; color:#ea580c; margin-bottom:6px; }
    .invoice-info p { font-size:13px; color:#78716c; margin-bottom:2px; }
    .parties { display:flex; justify-content:space-between; margin-bottom:28px; gap:20px; }
    .party { background:#fafaf9; border-radius:12px; padding:16px; flex:1; border:1px solid #f5f5f4; }
    .party-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#a8a29e; margin-bottom:6px; }
    .party-name { font-size:15px; font-weight:700; color:#1c1917; margin-bottom:2px; }
    .party-detail { font-size:12px; color:#78716c; }
    table { width:100%; border-collapse:collapse; margin-bottom:0; }
    thead tr { background:#1c1917; }
    thead th { padding:12px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:white; text-align:left; }
    thead th:nth-child(2) { text-align:center; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align:right; }
    .total-row { background:#fff7ed; }
    .total-row td { padding:14px 12px; font-size:16px; font-weight:900; color:#c2410c; }
    .footer { margin-top:32px; padding-top:20px; border-top:1px solid #f5f5f4; display:flex; justify-content:space-between; align-items:center; }
    .footer-brand { font-size:13px; color:#a8a29e; }
    .footer-brand strong { color:#ea580c; }
    .status-badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
    @media print {
      body { padding:20px; }
      @page { margin:10mm; size:A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Order<span>Pe</span></div>
      <div class="logo-sub">B2B Ordering Platform</div>
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Status:</strong> <span class="status-badge">${order.status.toUpperCase()}</span></p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">From (Distributor)</div>
      <div class="party-name">${session?.distributorName || 'Distributor'}</div>
    </div>
    <div class="party">
      <div class="party-label">To (Retailer)</div>
      <div class="party-name">${session?.retailerName || 'Retailer'}</div>
      <div class="party-detail">${session?.ownerName || ''}</div>
      <div class="party-detail">${session?.area || ''} · ${session?.phone || ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="3" style="padding:14px 12px;font-size:15px;font-weight:700;color:#1c1917;">Total Amount</td>
        <td style="padding:14px 12px;font-size:18px;font-weight:900;color:#c2410c;text-align:right;">₹${order.total_amount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-brand">Powered by <strong>OrderPe</strong> — Digital B2B Ordering</div>
    <div style="font-size:12px;color:#a8a29e;">Thank you for your business! 🙏</div>
  </div>
</body>
</html>`

    // Open in new window and trigger print (saves as PDF)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => {
        win.print()
      }, 500)
    }
  }

  // Share invoice via WhatsApp
  const shareInvoiceWhatsApp = (order: Order) => {
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const items = (order.order_items || []).map(i =>
      `  • ${i.product?.name} × ${i.quantity} = ₹${(i.line_total || i.quantity * i.unit_price).toLocaleString()}`
    ).join('\n')
    const msg = `🧾 *INVOICE — OrderPe*\n━━━━━━━━━━━━━━\n📋 Order: ${order.id}\n📅 Date: ${date}\n\n*Items:*\n${items}\n━━━━━━━━━━━━━━\n💰 *Total: ₹${order.total_amount.toLocaleString()}*\n\n_${session?.distributorName}_`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const statusConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
    pending:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '⏳ Pending confirm' },
    confirmed:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: '✅ Confirmed' },
    dispatched: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', label: '🚚 Raaste mein' },
    delivered:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: '📦 Deliver ho gaya' },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <style>{spin}</style>
      <div style={{ width: 40, height: 40, border: '3px solid #ea580c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#78716c', fontSize: 14, margin: 0 }}>Catalog load ho raha hai...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fafaf9' }}>
      <style>{spin}</style>

      {/* TOPBAR */}
      <div style={{ background: 'white', borderBottom: '1px solid #f5f5f4', padding: '40px 16px 12px', position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tab === 'catalog' ? 10 : 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 20, height: 20, background: '#ea580c', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>O</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: 15 }}>{session?.retailerName}</span>
            </div>
            <p style={{ fontSize: 11, color: '#a8a29e', margin: 0 }}>{session?.distributorName}</p>
          </div>
          {session && session.outstandingBalance > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '6px 12px', textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', margin: 0 }}>₹{session.outstandingBalance.toLocaleString()}</p>
              <p style={{ fontSize: 10, color: '#a8a29e', margin: 0 }}>baaki hai</p>
            </div>
          )}
        </div>
        {tab === 'catalog' && (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', fontSize: 14 }}>🔍</span>
            <input
              style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#f5f5f4', border: '2px solid transparent', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              placeholder="Product ya SKU search karein..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

        {/* ── CATALOG TAB ── */}
        {tab === 'catalog' && (
          <div>
            {/* CATEGORY PILLS */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', msOverflowStyle: 'none' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', border: '2px solid', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.1s',
                    background: category === cat ? '#ea580c' : 'white',
                    color: category === cat ? 'white' : '#57534e',
                    borderColor: category === cat ? '#ea580c' : '#e7e5e4' }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* SCHEMES BANNER — loads from Supabase */}
            {schemes.length > 0 && (
              <div style={{ margin: '0 16px 12px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: 16, padding: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#92400e', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🏷️ Aaj ke Special Offers
                </p>
                {schemes.map((s, i) => (
                  <div key={s.id} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', marginBottom: i < schemes.length - 1 ? 6 : 0, border: '1px solid #fde68a' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', margin: '0 0 2px' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: '#78716c', margin: '0 0 6px', lineHeight: 1.5 }}>{s.description}</p>
                    {s.tags && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {s.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                          <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* REPEAT LAST ORDER */}
            {orders.length > 0 && cart.length === 0 && (
              <div style={{ margin: '0 16px 12px' }}>
                <button onClick={repeatLast}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ea580c', color: 'white', border: 'none', borderRadius: 16, padding: '14px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(234,88,12,0.3)' }}>
                  <span>🔁 Pichla Order Repeat Karein</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>₹{orders[0]?.total_amount?.toLocaleString()} · {orders[0]?.order_items?.length} items</span>
                </button>
              </div>
            )}

            {/* PRODUCTS */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#a8a29e' }}>
                  <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 8 }}>📦</div>
                  <p style={{ margin: 0 }}>Koi product nahi mila</p>
                </div>
              ) : filtered.map(product => {
                const qty = getQty(product.id)
                return (
                  <div key={product.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #f5f5f4', padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 52, height: 52, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📦</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>{product.name}</p>
                      <p style={{ fontSize: 11, color: '#a8a29e', fontFamily: 'monospace', margin: '0 0 4px' }}>{product.sku_code}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: '#c2410c' }}>₹{product.price}</span>
                        {product.mrp > product.price && <span style={{ fontSize: 11, color: '#a8a29e', textDecoration: 'line-through' }}>₹{product.mrp}</span>}
                        <span style={{ fontSize: 10, color: '#a8a29e' }}>/{product.unit}</span>
                      </div>
                      {product.stock_quantity === 0 && <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, margin: 0 }}>⚠️ Stock nahi hai</p>}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {product.stock_quantity === 0 ? <span style={{ fontSize: 11, color: '#a8a29e' }}>N/A</span>
                      : qty === 0 ? (
                        <button onClick={() => addToCart(product)}
                          style={{ width: 40, height: 40, background: '#ea580c', color: 'white', border: 'none', borderRadius: 12, fontSize: 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(234,88,12,0.3)', fontFamily: 'inherit' }}>+</button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => setQty(product.id, qty - 1)} style={{ width: 36, height: 36, background: '#f5f5f4', border: 'none', borderRadius: 10, fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>−</button>
                          <span style={{ fontSize: 16, fontWeight: 900, width: 24, textAlign: 'center', color: '#c2410c' }}>{qty}</span>
                          <button onClick={() => setQty(product.id, qty + 1)} style={{ width: 36, height: 36, background: '#ea580c', color: 'white', border: 'none', borderRadius: 10, fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── CART TAB ── */}
        {tab === 'cart' && (
          <div style={{ padding: '20px 16px' }}>
            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: 20, marginBottom: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 36, margin: '0 0 8px' }}>🎉</p>
                <p style={{ fontWeight: 900, fontSize: 18, color: '#15803d', margin: '0 0 4px' }}>Order Place Ho Gaya!</p>
                <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>Aapka distributor jaldi confirm karega</p>
              </div>
            )}
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 }}>
                <div style={{ fontSize: 56, opacity: 0.15 }}>🛒</div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#57534e', margin: 0 }}>Cart khali hai</p>
                <p style={{ color: '#a8a29e', fontSize: 13, margin: 0 }}>Catalog se products add karein</p>
                <button onClick={() => setTab('catalog')} style={{ background: '#ea580c', color: 'white', border: 'none', borderRadius: 14, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>Catalog Dekhen</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>Aapka Order ({cartCount} items)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #f5f5f4', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{item.product.name}</p>
                        <p style={{ fontSize: 12, color: '#a8a29e', margin: 0 }}>₹{item.product.price} × {item.qty} = <span style={{ fontWeight: 700, color: '#1c1917' }}>₹{(item.qty * item.product.price).toLocaleString()}</span></p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setQty(item.product.id, item.qty - 1)} style={{ width: 34, height: 34, background: '#f5f5f4', border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>−</button>
                        <span style={{ fontSize: 15, fontWeight: 900, width: 24, textAlign: 'center', color: '#c2410c' }}>{item.qty}</span>
                        <button onClick={() => setQty(item.product.id, item.qty + 1)} style={{ width: 34, height: 34, background: '#ea580c', color: 'white', border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', border: '1px solid #e7e5e4', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#78716c' }}>Subtotal ({cartCount} items)</span>
                    <span style={{ fontWeight: 600 }}>₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 12, borderBottom: '1px solid #f5f5f4', marginBottom: 12 }}>
                    <span style={{ color: '#78716c' }}>Delivery</span>
                    <span style={{ fontWeight: 600, color: '#15803d' }}>Free</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16 }}>
                    <span>Total</span><span style={{ color: '#c2410c' }}>₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={placeOrder} disabled={placing}
                  style={{ width: '100%', padding: 16, background: placing ? '#d4cfc8' : '#ea580c', color: 'white', border: 'none', borderRadius: 18, fontSize: 16, fontWeight: 900, cursor: placing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: placing ? 'none' : '0 4px 14px rgba(234,88,12,0.35)' }}>
                  {placing ? <><span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Order ja raha hai...</> : `Order Karein · ₹${cartTotal.toLocaleString()}`}
                </button>
                <button onClick={() => setCart([])} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', fontSize: 13, color: '#a8a29e', cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>Cart Saaf Karein</button>
              </>
            )}
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div style={{ padding: '20px 16px' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>Aapke Orders</h2>
            {orders.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 }}>
                <div style={{ fontSize: 56, opacity: 0.15 }}>📋</div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#57534e', margin: 0 }}>Koi order nahi</p>
                <button onClick={() => setTab('catalog')} style={{ background: '#ea580c', color: 'white', border: 'none', borderRadius: 14, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Pehla Order Karein</button>
              </div>
            ) : orders.map(order => {
              const st = statusConfig[order.status] || statusConfig.pending
              return (
                <div key={order.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #f5f5f4', padding: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#a8a29e', margin: '0 0 2px' }}>{order.id}</p>
                      <p style={{ fontSize: 12, color: '#a8a29e', margin: 0 }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                  </div>

                  {/* ORDER ITEMS */}
                  <div style={{ background: '#fafaf9', borderRadius: 10, padding: '10px 12px', marginBottom: 10, border: '1px solid #f5f5f4' }}>
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: i < (order.order_items?.length || 0) - 1 ? '1px dashed #f5f5f4' : 'none' }}>
                        <span style={{ color: '#57534e' }}>{item.product?.name}</span>
                        <span style={{ color: '#a8a29e' }}>×{item.quantity}</span>
                        <span style={{ fontWeight: 700, color: '#1c1917' }}>₹{(item.line_total || item.quantity * item.unit_price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f5f5f4', paddingTop: 10, gap: 8 }}>
                    <span style={{ fontWeight: 900, fontSize: 16, color: '#c2410c' }}>₹{order.total_amount.toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* INVOICE BUTTON — always visible */}
                      <button onClick={() => downloadInvoicePDF(order)}
                        style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                        📄 PDF
                      </button>
                      <button onClick={() => shareInvoiceWhatsApp(order)}
                        style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                        💬 Share
                      </button>
                      {/* REORDER BUTTON */}
                      <button onClick={() => {
                        const items: CartItem[] = []
                        order.order_items?.forEach(item => {
                          const p = products.find(x => x.id === item.product_id)
                          if (p) items.push({ product: p, qty: item.quantity })
                        })
                        if (items.length > 0) { setCart(items); setTab('cart') }
                      }} style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        🔁 Repeat
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <div style={{ padding: '20px 16px' }}>
            {/* PROFILE */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f5f5f4', padding: 20, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#c2410c' }}>{session?.retailerName?.[0]}</div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 16, margin: 0 }}>{session?.retailerName}</p>
                  <p style={{ fontSize: 12, color: '#a8a29e', margin: '2px 0 0' }}>{session?.ownerName} · {session?.phone}</p>
                  <p style={{ fontSize: 12, color: '#a8a29e', margin: 0 }}>{session?.area}</p>
                </div>
              </div>
              <div style={{ background: '#fafaf9', borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#a8a29e', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aapka Distributor</p>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1c1917', margin: 0 }}>{session?.distributorName}</p>
              </div>
            </div>

            {/* UDHAAR BALANCE */}
            <div style={{ borderRadius: 20, padding: 20, marginBottom: 14, background: session && session.outstandingBalance > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${session && session.outstandingBalance > 0 ? '#fecaca' : '#bbf7d0'}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px', color: session && session.outstandingBalance > 0 ? '#dc2626' : '#15803d' }}>Udhaar Balance</p>
              <p style={{ fontSize: 30, fontWeight: 900, margin: '0 0 4px', color: session && session.outstandingBalance > 0 ? '#dc2626' : '#15803d' }}>₹{session?.outstandingBalance?.toLocaleString() || 0}</p>
              <p style={{ fontSize: 13, margin: 0, color: session && session.outstandingBalance > 0 ? '#b91c1c' : '#166534' }}>
                {session && session.outstandingBalance > 0 ? 'Please jaldi clear kar dijiye 🙏' : '✓ Sab clear hai! Koi baaki nahi.'}
              </p>
            </div>

            {/* ACTIVE SCHEMES */}
            {schemes.length > 0 && (
              <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f5f5f4', padding: 20, marginBottom: 14 }}>
                <p style={{ fontWeight: 900, fontSize: 15, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>🏷️ Active Schemes</p>
                {schemes.map((s, i) => (
                  <div key={s.id} style={{ borderBottom: i < schemes.length - 1 ? '1px solid #f5f5f4' : 'none', paddingBottom: i < schemes.length - 1 ? 12 : 0, marginBottom: i < schemes.length - 1 ? 12 : 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{s.name}</p>
                    <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 6px', lineHeight: 1.5 }}>{s.description}</p>
                    {s.tags && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {s.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                          <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ORDER STATS */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f5f5f4', padding: 20, marginBottom: 14 }}>
              <p style={{ fontWeight: 900, fontSize: 15, margin: '0 0 14px' }}>📊 Aapki Summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { v: orders.length, l: 'Total Orders' },
                  { v: `₹${orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}`, l: 'Total Value' },
                  { v: orders.filter(o => o.status === 'delivered').length, l: 'Delivered' },
                  { v: orders.filter(o => o.status === 'pending').length, l: 'Pending' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#fafaf9', border: '1px solid #f5f5f4', borderRadius: 14, padding: 14 }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: '#c2410c', margin: '0 0 2px' }}>{s.v}</p>
                    <p style={{ fontSize: 12, color: '#a8a29e', margin: 0 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { clearRetSession(); router.replace('/shop/login') }}
              style={{ width: '100%', padding: 14, background: 'white', border: '2px solid #e7e5e4', borderRadius: 16, fontSize: 14, fontWeight: 700, color: '#57534e', cursor: 'pointer', fontFamily: 'inherit' }}>
              🚪 Logout Karein
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'white', borderTop: '2px solid #f5f5f4', display: 'flex', zIndex: 40, boxShadow: '0 -4px 12px rgba(0,0,0,0.08)' }}>
        {[
          { id: 'catalog', icon: '🏪', label: 'Catalog' },
          { id: 'cart',    icon: '🛒', label: 'Cart',   badge: cartCount },
          { id: 'orders',  icon: '📋', label: 'Orders' },
          { id: 'account', icon: '👤', label: 'Account' },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id as typeof tab)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', position: 'relative', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: tab === item.id ? '#ea580c' : '#a8a29e', marginTop: 3 }}>{item.label}</span>
            {tab === item.id && <div style={{ position: 'absolute', bottom: 0, width: 24, height: 3, background: '#ea580c', borderRadius: 2 }} />}
            {item.badge && item.badge > 0 && (
              <span style={{ position: 'absolute', top: 6, right: '18%', background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 900, borderRadius: '50%', minWidth: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{item.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
