'use client'
import { useState } from 'react'
const D = [{id:1,name:'Ramesh Patil',phone:'9876000001',area:'Vashi + Turbhe',retailers:12,orders:38,collections:'₹24,000'},{id:2,name:'Sunil More',phone:'9876000002',area:'Nerul + Ghansoli',retailers:8,orders:21,collections:'₹11,500'}]
export default function SalesmanPage() {
  const [list, setList] = useState(D)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', area:'' })
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:900, margin:0 }}>Salesmen</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Karein</button>
      </div>
      <div className="card">
        {list.map(s => (
          <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid #f5f5f4' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#1d4ed8', flexShrink:0 }}>{s.name[0]}</div>
            <div style={{ flex:1 }}><p style={{ fontWeight:700, fontSize:13, margin:0 }}>{s.name}</p><p style={{ fontSize:11, color:'#a8a29e', margin:0 }}>{s.phone} · {s.area}</p></div>
            <div style={{ display:'flex', gap:20, textAlign:'center' }}>
              {[{v:s.retailers,l:'Retailers'},{v:s.orders,l:'Orders'},{v:s.collections,l:'Collections'}].map(x => (
                <div key={x.l}><p style={{ fontWeight:900, fontSize:14, margin:0 }}>{x.v}</p><p style={{ fontSize:10, color:'#a8a29e', margin:0 }}>{x.l}</p></div>
              ))}
            </div>
            <button className="btn btn-wa btn-sm" onClick={() => window.open(`https://wa.me/91${s.phone}`, '_blank')}>💬</button>
          </div>
        ))}
      </div>
      {show && (
        <div className="modal-bg" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3 style={{ margin:0, fontWeight:700 }}>Salesman Add Karein</h3><button onClick={() => setShow(false)} style={{ width:32, height:32, borderRadius:'50%', background:'#f5f5f4', border:'none', cursor:'pointer' }}>✕</button></div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[['Poora Naam *','name'],['Phone *','phone'],['Area / Route','area']].map(([l,k]) => (
                <div key={k}><label className="label">{l}</label><input className="input" value={form[k as keyof typeof form]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} /></div>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { if(!form.name||!form.phone)return; setList(p=>[...p,{id:Date.now(),...form,retailers:0,orders:0,collections:'₹0'}]); setShow(false); setForm({name:'',phone:'',area:''}) }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
