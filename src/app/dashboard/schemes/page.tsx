'use client'
import { useState } from 'react'
const D = [{id:1,name:'Diwali Combo Offer',desc:'Surf Excel 5 + Colgate 5 = 8% off',tags:['Surf Excel','Colgate'],active:true},{id:2,name:'Salt Bulk Offer',desc:'30+ Tata Salt = 2% margin credit',tags:['Tata Salt'],active:true}]
export default function SchemesPage() {
  const [schemes, setSchemes] = useState(D)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', desc:'', tags:'' })
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div><h1 style={{ fontSize:22, fontWeight:900, margin:0 }}>Schemes & Offers</h1><p style={{ color:'#78716c', fontSize:13, margin:'4px 0 0' }}>Retailers ki app mein turant dikhai deta hai</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Naya Scheme</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {schemes.map(s => (
          <div key={s.id} className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'start', justifyContent:'space-between', marginBottom:8 }}>
              <h3 style={{ fontWeight:700, margin:0 }}>{s.name}</h3>
              <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:8, background: s.active?'#f0fdf4':'#f5f5f4', color:s.active?'#15803d':'#78716c', border:`1px solid ${s.active?'#bbf7d0':'#e7e5e4'}` }}>{s.active?'✅ Active':'⏸ Paused'}</span>
            </div>
            <p style={{ fontSize:13, color:'#78716c', marginBottom:12 }}>{s.desc}</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {s.tags.map(t => <span key={t} style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'#fff7ed', color:'#c2410c', border:'1px solid #fed7aa' }}>{t}</span>)}
              <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe' }}>Sabhi retailers</span>
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="modal-bg" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3 style={{ margin:0, fontWeight:700 }}>Naya Scheme</h3><button onClick={() => setShowAdd(false)} style={{ width:32, height:32, borderRadius:'50%', background:'#f5f5f4', border:'none', cursor:'pointer' }}>✕</button></div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label className="label">Scheme ka Naam *</label><input className="input" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} /></div>
              <div><label className="label">Description</label><textarea className="input" style={{ height:80, resize:'none' }} value={form.desc} onChange={e => setForm(f => ({...f,desc:e.target.value}))} /></div>
              <div><label className="label">Products (comma se alag)</label><input className="input" value={form.tags} onChange={e => setForm(f => ({...f,tags:e.target.value}))} placeholder="Surf Excel, Colgate" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { if(!form.name)return; setSchemes(p=>[...p,{id:Date.now(),name:form.name,desc:form.desc,tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean),active:true}]); setShowAdd(false); setForm({name:'',desc:'',tags:''}) }}>Launch Karein</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
