import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Distributor = {
  id: string; name: string; phone: string; area: string
  erp_type: string; is_active: boolean; password_hash: string; created_at: string
}
export type Retailer = {
  id: string; distributor_id: string; name: string; owner_name: string
  phone: string; area: string; pin: string; credit_limit: number
  outstanding_balance: number; is_active: boolean; created_at: string
}
export type Product = {
  id: string; distributor_id: string; name: string; sku_code: string
  category: string; price: number; mrp: number; stock_quantity: number
  unit: string; is_active: boolean; created_at: string
}
export type Order = {
  id: string; distributor_id: string; retailer_id: string
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered'
  order_source: 'app' | 'whatsapp' | 'manual'
  total_amount: number; notes: string; created_at: string
  confirmed_at: string | null; dispatched_at: string | null; delivered_at: string | null
  retailer?: Retailer; order_items?: OrderItem[]
}
export type OrderItem = {
  id: string; order_id: string; product_id: string
  quantity: number; unit_price: number; line_total: number; product?: Product
}
