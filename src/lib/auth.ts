import { supabase } from './supabase'

const DIST_KEY = 'orderpe_dist'
const RET_KEY  = 'orderpe_ret'

export type DistSession = {
  distributorId: string; distributorName: string
  phone: string; area: string; loginTime: number
}
export type RetSession = {
  retailerId: string; retailerName: string; ownerName: string
  phone: string; area: string; distributorId: string
  distributorName: string; outstandingBalance: number; loginTime: number
}

export function getDistSession(): DistSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DIST_KEY)
    if (!raw) return null
    const s: DistSession = JSON.parse(raw)
    if (Date.now() - s.loginTime > 7 * 86400000) { localStorage.removeItem(DIST_KEY); return null }
    return s
  } catch { return null }
}
export function setDistSession(s: DistSession) { localStorage.setItem(DIST_KEY, JSON.stringify(s)) }
export function clearDistSession() { localStorage.removeItem(DIST_KEY) }

export async function loginDistributor(phone: string, password: string): Promise<{ session: DistSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('distributors').select('*')
    .eq('phone', phone.trim()).eq('is_active', true).single()
  if (error || !data) return { session: null, error: 'Yeh phone number registered nahi hai.' }
  if (data.password_hash !== password) return { session: null, error: 'Password galat hai. Dobara try karein.' }
  const s: DistSession = {
    distributorId: data.id, distributorName: data.name,
    phone: data.phone, area: data.area, loginTime: Date.now()
  }
  setDistSession(s)
  return { session: s, error: null }
}

export function getRetSession(): RetSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(RET_KEY)
    if (!raw) return null
    const s: RetSession = JSON.parse(raw)
    if (Date.now() - s.loginTime > 30 * 86400000) { localStorage.removeItem(RET_KEY); return null }
    return s
  } catch { return null }
}
export function setRetSession(s: RetSession) { localStorage.setItem(RET_KEY, JSON.stringify(s)) }
export function clearRetSession() { localStorage.removeItem(RET_KEY) }

export async function loginRetailer(phone: string, pin: string): Promise<{ session: RetSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('retailers')
    .select('*, distributor:distributors(id, name)')
    .eq('phone', phone.trim()).eq('is_active', true).single()
  if (error || !data) return { session: null, error: 'Yeh number registered nahi hai. Apne distributor se contact karein.' }
  if (data.pin !== pin) return { session: null, error: 'PIN galat hai. Apne distributor se reset karwayein.' }
  const dist = Array.isArray(data.distributor) ? data.distributor[0] : data.distributor
  const s: RetSession = {
    retailerId: data.id, retailerName: data.name,
    ownerName: data.owner_name || data.name,
    phone: data.phone, area: data.area,
    distributorId: data.distributor_id,
    distributorName: dist?.name || 'Aapka Distributor',
    outstandingBalance: data.outstanding_balance || 0,
    loginTime: Date.now()
  }
  setRetSession(s)
  return { session: s, error: null }
}
