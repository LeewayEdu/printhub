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

export interface LastAdded { key: number; cartItemId: string; name: string; summary: string; price: number }

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