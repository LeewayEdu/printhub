'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  specs: Record<string, string[]>;
  featured: boolean;
  badge: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (data: Partial<Product> & { image?: File | null }) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product> & { image?: File | null }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    set({ products: data as Product[], isLoading: false });
  },

  addProduct: async ({ image, ...productData }) => {
    set({ isLoading: true, error: null });
    let image_url: string | null = null;

    if (image) {
      const filePath = `${crypto.randomUUID()}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, image);

      if (uploadError) {
        set({ error: uploadError.message, isLoading: false });
        toast.error(uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from('products').insert({ ...productData, image_url });

    if (error) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
      return;
    }

    await get().fetchProducts();
    toast.success('Product added!');
  },

  updateProduct: async (id, { image, ...productData }) => {
    set({ isLoading: true, error: null });
    let image_url: string | null = null;
    const existing = get().products.find((p) => p.id === id);

    if (image) {
      const filePath = `${crypto.randomUUID()}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, image);

      if (uploadError) {
        set({ error: uploadError.message, isLoading: false });
        toast.error(uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    } else {
      image_url = existing?.image_url ?? null;
    }

    const { error } = await supabase
      .from('products')
      .update({ ...productData, image_url })
      .eq('id', id);

    if (error) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
      return;
    }

    await get().fetchProducts();
    toast.success('Product updated!');
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
      return;
    }

    await get().fetchProducts();
    toast.success('Product deleted!');
  },
}));