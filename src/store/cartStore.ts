'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import toast from 'react-hot-toast'
import { cookieStorage } from './customCookieStorage'

export interface DesignDetails {
  type: 'upload' | 'link' | 'request' | null
  fileUrl?: string | null
  link?: string | null
  brief?: {
    businessName?: string
    colors?: string
    slogan?: string
    notes?: string
    referenceUrl?: string
  } | null
}

export interface DesignPricingResolved {
  hasOwnDesign: boolean
  designCostTotal: number
  designAddons: { name: string; price: number }[]
  designUnits?: number
  designRequestNotes?: string
}

export interface CartItem {
  /** 'book' lines come from C-Chu Books. Everything else is a normal print product. */
  kind?: 'product' | 'book'
  bookId?: string
  bookFormatId?: string
  bookType?: 'print' | 'ebook' | 'bundle'
  /** Currency of `price`. Absent means NGN. USD only ever appears on ebook-only carts. */
  currency?: 'NGN' | 'USD'
  image?: string        // books only (product photos are looked up by product id)
  cartItemId: string
  productId: string
  name: string
  price: number        // TOTAL calculated price including design cost
  printPrice: number   // Print-only portion (for breakdown display)
  displayQty: string   // Human readable e.g. "100 pcs" or "5x7 sqft"
  quantity: number     // Always 1 for print jobs, can be more for simple items
  specs?: Record<string, string>
  design?: DesignDetails | null
  designPricing?: DesignPricingResolved | null
}

export interface LastAdded { key: number; cartItemId: string; name: string; summary: string; price: number; currency?: 'NGN' | 'USD' }

export interface BookCartInput {
  bookId: string; bookFormatId: string; title: string; type: 'print' | 'ebook' | 'bundle'
  unitPrice: number; quantity: number; currency: 'NGN' | 'USD'; image?: string
}
export type AddBookResult = { ok: true } | { ok: false; reason: string }

/** The cart's currency: USD only when every line is a USD ebook (mixing is refused when adding). */
export const cartCurrency = (items: CartItem[]): 'NGN' | 'USD' => (items.length > 0 && items.every(i => i.currency === 'USD') ? 'USD' : 'NGN')

interface CartState {
  items: CartItem[]
  /** The most recent add, for the "added to cart" panel. Not saved with the cart. */
  lastAdded: LastAdded | null
  addToCart: (
    productId: string,
    name: string,
    price: number,
    displayQty: string,
    specs?: Record<string, string>,
    designPricing?: DesignPricingResolved | null,
    silent?: boolean,
  ) => void
  addBookToCart: (b: BookCartInput) => AddBookResult
  removeFromCart: (cartItemId: string) => void
  updateDesign: (cartItemId: string, design: DesignDetails) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastAdded: null,

      addToCart: (productId, name, price, displayQty, specs = {}, designPricing = null, silent = false) => {
        const designCost = designPricing?.designCostTotal ?? 0
        const newItem: CartItem = {
          cartItemId: crypto.randomUUID(),
          productId,
          name,
          price: price + designCost,  // total = print + design
          printPrice: price,
          displayQty,
          quantity: 1,
          specs,
          design: null,
          designPricing,
        }
        // Short options summary for the panel: the chosen values, not the quantity line
        const summary = [displayQty, ...Object.entries(specs).filter(([k, v]) => v && k !== 'Quantity').map(([, v]) => String(v))].join(' · ')
        set({
          items: [...get().items, newItem],
          lastAdded: silent ? get().lastAdded : { key: Date.now(), cartItemId: newItem.cartItemId, name, summary: summary.slice(0, 120), price: newItem.price },
        })
      },

      addBookToCart: (b) => {
        const items = get().items
        // USD ebooks are bought on their own: a cart cannot mix currencies
        if (items.some(i => (i.currency || 'NGN') !== b.currency)) {
          return { ok: false, reason: b.currency === 'USD'
            ? 'USD ebooks must be bought in a separate order. Please check out your current cart first.'
            : 'Your cart has USD items. Please check out those first, then add this book.' }
        }
        const existing = items.find(i => i.kind === 'book' && i.bookFormatId === b.bookFormatId)
        if (existing) {
          if (b.type === 'ebook') return { ok: false, reason: 'This ebook is already in your cart.' }
          const qty = Math.min(50, existing.quantity + b.quantity)
          set({ items: items.map(i => i.cartItemId === existing.cartItemId ? { ...i, quantity: qty, price: Math.round(b.unitPrice * qty * 100) / 100, displayQty: `${qty} ${qty === 1 ? 'copy' : 'copies'}` } : i) })
          return { ok: true }
        }
        const label = b.type === 'ebook' ? 'Ebook' : b.type === 'print' ? 'Print' : 'Print + Ebook bundle'
        const total = Math.round(b.unitPrice * b.quantity * 100) / 100
        const newItem: CartItem = {
          kind: 'book', bookId: b.bookId, bookFormatId: b.bookFormatId, bookType: b.type, currency: b.currency, image: b.image,
          cartItemId: crypto.randomUUID(), productId: `book:${b.bookFormatId}`, name: `${b.title} (${label})`,
          price: total, printPrice: total, quantity: b.quantity,
          displayQty: b.type === 'ebook' ? 'Digital download' : `${b.quantity} ${b.quantity === 1 ? 'copy' : 'copies'}`,
          specs: { Format: label }, design: null, designPricing: null,
        }
        set({ items: [...items, newItem], lastAdded: { key: Date.now(), cartItemId: newItem.cartItemId, name: newItem.name, summary: newItem.displayQty, price: total, currency: b.currency } })
        return { ok: true }
      },

      removeFromCart: (cartItemId) => {
        set({ items: get().items.filter(i => i.cartItemId !== cartItemId) })
        toast.success('Item removed')
      },

      updateDesign: (cartItemId, design) => {
        set({
          items: get().items.map(i =>
            i.cartItemId === cartItemId ? { ...i, design } : i
          )
        })
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.length,

      totalPrice: () => get().items.reduce((sum, item) => sum + item.price, 0),
    }),
    {
      name: 'printhub-cart',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({ items: state.items }),   // only the items are saved, never the panel state
    }
  )
)