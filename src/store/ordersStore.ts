'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  specs: Record<string, string> | null;
  design: unknown | null;
}

export type OrderStatus =
  | 'pending' | 'paid' | 'processing'
  | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  paystack_reference: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  shipping_method: 'home' | 'pickup';
  address_line1: string;
  address_line2: string | null;
  state: string;
  delivery_area: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items?: OrderItem[];
  // Extended fields
  receipt_url?: string | null;
  production_notes?: string | null;
  receipt_verified?: boolean;
  verified_at?: string | null;
  rush_order?: boolean;
  deadline_date?: string | null;
  user_id?: string;
  referral_code?: string | null;
}

interface OrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  clearOrders: () => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      isLoading: false,
      error: null,

      fetchOrders: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const ordersWithItems = await Promise.all(
            (data || []).map(async (order) => {
              const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);
              return { ...order, items: items || [] };
            })
          );

          set({ orders: ordersWithItems as Order[] });
        } catch (err: unknown) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      addOrder: (order) => set({ orders: [order, ...get().orders] }),
      clearOrders: () => set({ orders: [] }),
    }),
    {
      name: 'printhub-orders',
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);