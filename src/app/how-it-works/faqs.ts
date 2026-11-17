import { GENERAL_TURNAROUND } from '@/lib/turnaround'

// FAQ content for /how-it-works. Rendered on the page and reused for FAQPage JSON-LD.
export const FAQS = [
  {
    q: 'How long does printing take?',
    a: `Turnaround depends on the product, and each product page shows it where we have one on record. Printing copies of a book: 2–5 working days after proof approval. Full publishing (editing, typesetting, ISBN, cover): 7–14 working days. Shirts and stickers: ${GENERAL_TURNAROUND.text.replace('-', '–')}. Rush service is available: message us on WhatsApp for turnaround on your job.`,
  },
  {
    q: 'What file formats do you accept for designs?',
    a: 'We accept PDF, PNG, JPG, AI (Adobe Illustrator), PSD (Photoshop), and CorelDRAW files. For best print quality, files should be at 300 DPI or higher. PDF is preferred.',
  },
  {
    q: 'Do I need my design file before I pay?',
    a: 'No. If you have your own file you can check out first and upload it afterwards, from the order confirmation page or from My Orders. We will not start printing until we have it, and we will send you a reminder by email if it has not arrived. After you upload, we send a proof, and printing starts once you approve it.',
  },
  {
    q: 'What if I don\'t have a design?',
    a: 'No problem. On the product page choose "No, I need design" and our design team will create one for you. Fill in a brief with your business name, preferred colours, slogan, and any notes or reference images. Design fees vary by product and are included in some packages.',
  },
  {
    q: 'Can I order from outside Abuja?',
    a: 'Yes. We ship nationwide via waybill to all 36 states. Interstate delivery fees range from ₦3,000 to ₦7,000 depending on your state. You can also send a representative to pick up from our Karu Office.',
  },
  {
    q: 'What is the minimum order quantity?',
    a: 'MOQ varies by product. Business cards start at 100 pieces. Flyers at 100 pieces. T-shirts at 6 pieces. Banners and signage start at 1 piece. You can see the MOQ for each product on its order page.',
  },
  {
    q: 'How does the loyalty points system work?',
    a: 'You earn 2% of every order value as loyalty points when your order is delivered. 1 point equals ₦1. Points can be redeemed at checkout. Minimum redemption is 500 points (₦500).',
  },
  {
    q: 'Can I track my order?',
    a: 'Yes. Log into your dashboard and go to My Orders. Every order shows its current status: Pending, Confirmed, In Production, Ready, Shipped, or Delivered. You also receive WhatsApp updates.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all debit cards, bank transfers, and USSD payments via Paystack. Cash payment is available for pickup orders.',
  },
  {
    q: 'Can I reorder a previous job?',
    a: 'Yes. Go to your dashboard, find the previous order, and click Reorder. Your specs and quantity are pre-filled. You just confirm and pay.',
  },
  {
    q: 'What is the affiliate program?',
    a: 'You earn commission every time someone you referred places an order. The commission is 10% on their first 5 orders, 5% on orders 6-10, and 3% on all orders after that — for life. No investment needed. Just share your unique referral link.',
  },
  {
    q: 'What if I am not happy with my order?',
    a: 'We take quality very seriously. If the error is ours, we reprint for free (or refund where a reprint is not practical). Contact us via WhatsApp or email within 48 hours of receiving your order with photos of the issue.',
  },
  {
    q: 'Do you offer bulk discounts?',
    a: 'Yes. All our unit-priced products have quantity tiers — the more you order, the lower the cost per unit. The price updates automatically as you adjust quantity on the product page.',
  },
]
