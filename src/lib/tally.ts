import { Order } from './supabase'

export function generateTallyXML(orders: Order[]): string {
  const date = new Date().toLocaleDateString('en-GB').split('/').reverse().join('')
  const vouchers = orders
    .filter(o => ['confirmed', 'dispatched', 'delivered'].includes(o.status))
    .map(o => {
      const items = (o.order_items || []).map(i =>
        `<ALLINVENTORYENTRIES.LIST><STOCKITEMNAME>${i.product?.name || ''}</STOCKITEMNAME><ACTUALQTY>${i.quantity}</ACTUALQTY><RATE>${i.unit_price}</RATE></ALLINVENTORYENTRIES.LIST>`
      ).join('')
      return `<TALLYMESSAGE><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>${date}</DATE><VOUCHERNUMBER>${o.id}</VOUCHERNUMBER><PARTYLEDGERNAME>${o.retailer?.name || ''}</PARTYLEDGERNAME><AMOUNT>${o.total_amount}</AMOUNT>${items}</VOUCHER></TALLYMESSAGE>`
    }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Import</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${vouchers}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`
}

export function downloadXML(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/xml' }))
  a.download = filename
  a.click()
}

export function generateWhatsAppInvoice(order: Order, distName: string): string {
  const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const items = (order.order_items || []).map(i =>
    `  • ${i.product?.name} × ${i.quantity} = ₹${(i.line_total || i.quantity * i.unit_price).toLocaleString()}`
  ).join('\n')
  return `🧾 *INVOICE — OrderPe*\n━━━━━━━━━━━━━━\n📋 Order: ${order.id}\n📅 Date: ${date}\n🏪 To: ${order.retailer?.name}\n\n*Items:*\n${items}\n━━━━━━━━━━━━━━\n💰 *Total: ₹${order.total_amount.toLocaleString()}*\n\n_${distName}_\n_Powered by OrderPe_`
}
