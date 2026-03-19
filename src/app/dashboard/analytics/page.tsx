'use client'
import { useEffect, useState } from 'react'
import { supabase, Order, Retailer } from '@/lib/supabase'
import { getDistSession } from '@/lib/auth'
export default function AnalyticsPage() {
  const distId = getDistSession()?.distributorId
  const [orders, setOrders] = useState<Order[]>([])
  const [retailers, setRetailers] = useState<Retailer[]>([])
  useEffect(() => {
    if (!distId) return
    supabase.from('orders').select('*').eq('distributor_id', distId).then(({ data }) => { if (data) setOrders(data) })
    supabase.from('retailers').select('*').eq('distributor_id', distId).then(({ data }) => { if (data) setRetailers(data) })
  }, [distId])
  const rev = orders.filter(o => o.status !== 'pending').reduce((s, o) => s + o.total_amount, 0)
  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:900, margin:'0 0 20px' }}>Analytics</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[{v:orders.length,l:'Total Orders',c:'#1c1917'},{v:`₹${rev.toLocaleString()}`,l:'Revenue',c:'#c2410c'},{v:`₹${Math.round(rev/(orders.length||1)).toLocaleString()}`,l:'Avg Order',c:'#1c1917'},{v:`₹${retailers.reduce((s,r)=>s+r.outstanding_balance,0).toLocaleString()}`,l:'Outstanding',c:'#dc2626'}].map((x,i) => (
          <div key={i} className="stat-card"><p style={{ fontSize:24, fontWeight:900, color:x.c, margin:'0 0 4px' }}>{x.v}</p><p style={{ fontSize:12, fontWeight:600, color:'#57534e', margin:0 }}>{x.l}</p></div>
        ))}
      </div>
      <div className="card">
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #f5f5f4', background:'#fafaf9' }}><h3 style={{ margin:0, fontWeight:700, fontSize:14 }}>Retailer Performance</h3></div>
        {retailers.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'#a8a29e' }}>No retailers yet</div> :
          retailers.map(r => {
            const ro = orders.filter(o => o.retailer_id === r.id)
            return <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid #f5f5f4' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#c2410c', flexShrink:0 }}>{r.name[0]}</div>
              <div style={{ flex:1 }}><p style={{ fontWeight:700, fontSize:13, margin:0 }}>{r.name}</p><p style={{ fontSize:11, color:'#a8a29e', margin:0 }}>{r.area}</p></div>
              <div style={{ flex:1, margin:'0 16px' }}>
                <div style={{ height:6, background:'#f5f5f4', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', background:'#ea580c', width:`${Math.min(100,ro.length*10)}%`, borderRadius:3 }}/></div>
                <p style={{ fontSize:10, color:'#a8a29e', margin:'3px 0 0' }}>{ro.length} orders</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontWeight:900, fontSize:13, margin:0 }}>₹{ro.reduce((s,o)=>s+o.total_amount,0).toLocaleString()}</p>
                <p style={{ fontSize:11, color:r.outstanding_balance>0?'#dc2626':'#15803d', fontWeight:600, margin:0 }}>{r.outstanding_balance>0?`₹${r.outstanding_balance.toLocaleString()} due`:'✓ Clear'}</p>
              </div>
            </div>
          })
        }
      </div>
    </div>
  )
}
