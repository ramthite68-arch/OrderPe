import { Product } from './supabase'

export type ParsedItem = { product: Product; qty: number }
export type ParseResult = { matched: ParsedItem[]; unmatched: string[] }

export function parseWhatsAppOrder(message: string, products: Product[]): ParseResult {
  const fillers = ['bhai', 'do', 'bhej', 'chahiye', 'please', 'aur', 'aaj', 'kal', 'dena', 'dedo', 'hai', 'ka', 'ki', 'ke', 'yaar', 'jaldi', 'send']
  const matched: ParsedItem[] = []
  const unmatched: string[] = []

  message.toLowerCase().split(/[\n,]+/).map(s => s.trim()).filter(Boolean).forEach(line => {
    const words = line.split(/[\s\-:]+/)
    let found = false
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toUpperCase()
      const p = products.find(p => p.sku_code?.toUpperCase() === w)
        || products.find(p => p.name.toLowerCase().includes(words[i]) && words[i].length > 2)
      if (p) {
        const qty = words.filter((_, j) => j !== i).find(w => /^\d+$/.test(w))
        matched.push({ product: p, qty: qty ? parseInt(qty) : 1 })
        found = true
        break
      }
    }
    if (!found && line.length > 2) {
      const isFillerOnly = line.split(/\s+/).every(w => fillers.includes(w) || /^\d+$/.test(w))
      if (!isFillerOnly) unmatched.push(line)
    }
  })
  return { matched, unmatched }
}
