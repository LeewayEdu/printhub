'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Order, OrderStatus } from './ordersStore';

interface AdminOrdersState {
  orders: Order[];
  filteredOrders: Order[];
  isLoading: boolean;
  error: string | null;
  filter: OrderStatus | 'all';
  fetchAllOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addProductionNote: (orderId: string, note: string) => Promise<void>;
  approveReceipt: (orderId: string) => Promise<void>;
  setFilter: (filter: OrderStatus | 'all') => void;
}

export const useAdminOrdersStore = create<AdminOrdersState>((set, get) => ({
  orders: [],
  filteredOrders: [],
  isLoading: false,
  error: null,
  filter: 'all',

  fetchAllOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
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

      set({ orders: ordersWithItems as Order[], filteredOrders: ordersWithItems as Order[] });
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateOrderStatus: async (orderId, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) { toast.error(error.message); return; }

    // ── On delivery: award loyalty points + affiliate commission ──
    if (status === 'delivered') {
      // Loyalty points
      const { error: loyaltyErr } = await supabase.rpc('award_loyalty_on_delivery', {
        p_order_id: orderId,
        p_admin_id: session.user.id,
      });
      if (loyaltyErr) console.error('Loyalty award failed:', loyaltyErr.message);

      // Affiliate commission
      const { error: commErr } = await supabase.rpc('award_affiliate_commission', {
        p_order_id: orderId,
      });
      if (commErr) console.error('Commission award failed:', commErr.message);
    }

    // ── On paid: verify bank transfer receipt ──
    if (status === 'paid') {
      await supabase.from('orders').update({
        receipt_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: session.user.id,
      }).eq('id', orderId);
    }

    // Update local state
    set({
      orders: get().orders.map((o) => o.id === orderId ? { ...o, status } : o),
      filteredOrders: get().filteredOrders.map((o) => o.id === orderId ? { ...o, status } : o),
    });

    const messages: Record<string, string> = {
      delivered: 'Order marked delivered. Loyalty points + commissions awarded ✅',
      paid: 'Payment confirmed. Receipt verified ✅',
      processing: 'Order moved to production',
      shipped: 'Order marked as shipped',
      cancelled: 'Order cancelled',
      refunded: 'Order refunded',
    };
    toast.success(messages[status] || 'Order status updated');
  },

  addProductionNote: async (orderId, note) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;

    const existing = (order as any).production_notes || '';
    const timestamp = new Date().toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
    const newNote = existing
      ? `${existing}\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;

    const { error } = await supabase
      .from('orders')
      .update({ production_notes: newNote })
      .eq('id', orderId);

    if (error) { toast.error(error.message); return; }

    set({
      orders: get().orders.map(o => o.id === orderId ? { ...o, production_notes: newNote } as any : o),
      filteredOrders: get().filteredOrders.map(o => o.id === orderId ? { ...o, production_notes: newNote } as any : o),
    });
    toast.success('Note saved');
  },

  approveReceipt: async (orderId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('orders').update({
      status: 'paid',
      receipt_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: session.user.id,
    }).eq('id', orderId);

    if (error) { toast.error(error.message); return; }

    set({
      orders: get().orders.map(o => o.id === orderId ? { ...o, status: 'paid', receipt_verified: true } as any : o),
      filteredOrders: get().filteredOrders.map(o => o.id === orderId ? { ...o, status: 'paid', receipt_verified: true } as any : o),
    });
    toast.success('Receipt approved. Order marked as paid ✅');
  },

  setFilter: (filter) => {
    const all = get().orders;
    set({
      filter,
      filteredOrders: filter === 'all' ? all : all.filter((o) => o.status === filter),
    });
  },
}));