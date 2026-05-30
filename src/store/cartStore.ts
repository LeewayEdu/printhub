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

export interface CartItem {
  cartItemId: string
  productId: string
  name: string
  price: number        // TOTAL calculated price for this line item
  displayQty: string   // Human readable e.g. "100 pcs" or "5x7 sqft"
  quantity: number     // Always 1 for print jobs, can be more for simple items
  specs?: Record<string, string>
  design?: DesignDetails | null
}

interface CartState {
  items: CartItem[]
  addToCart: (
    productId: string,
    name: string,
    price: number,
    displayQty: string,
    specs?: Record<string, string>,
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

      addToCart: (productId, name, price, displayQty, specs = {}) => {
        const newItem: CartItem = {
          cartItemId: crypto.randomUUID(),
          productId,
          name,
          price,        // total calculated price
          displayQty,   // e.g. "100 pcs" or "5×7 sqft"
          quantity: 1,  // always 1 per line item
          specs,
          design: null,
        }
        set({ items: [...get().items, newItem] })
        toast.success(`${name} added to cart!`)
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
    }
  )
)