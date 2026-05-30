'use client';

import { create } from 'zustand';

export type ShippingMethod = 'home' | 'pickup';

export interface CheckoutState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shippingMethod: ShippingMethod;
  address1: string;
  address2: string;
  state: string;
  deliveryArea: string;
  deliveryFee: number;
  setField: <K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) => void;
  reset: () => void;
  updateDeliveryFee: () => void;
}

const AbujaDeliveryFees: Record<string, number> = {
  'Buhari': 6000, 'Kubwa': 6000, 'Idu': 6000, 'Lugbe': 6000,
  'Kuje': 6000, 'Airport Road': 6000, 'Karashi': 6000, 'Orozo': 6000,
  'Masaka': 6000, 'Giri': 6000, 'Madalla': 6000, 'Zuba': 6000,
  'Dutse': 5000, 'Gwaripa': 5000, 'Dawaki': 5000, 'Jabi': 5000,
  'Jahi': 5000, 'Utako': 5000, 'Mabushi': 5000, 'Ado': 5000,
  'Life Camp': 5000, 'Katampe': 5000, 'Katampe Extension': 5000,
  'Galadimawa': 5000, 'Galadima': 5000,
  'Gudu': 4000, 'Apo': 4000, 'Garki': 4000, 'Maitama': 4000,
  'Asokoro': 4000, 'Papei': 4000, 'Maraba': 4000, 'Abacha Road': 4000,
  'City College': 4000, 'Nyanya': 4000, 'Kpegyi': 4000, 'Jikwoyi': 4000,
  'Karu': 4000, 'New Karu': 4000, 'New Nyanya': 4000,
  'Gwagwalada': 8000, 'Kwali': 8000, 'Suleja': 8000, 'Abaji': 8000,
};

const DEFAULT: Omit<CheckoutState, 'setField' | 'reset' | 'updateDeliveryFee'> = {
  firstName: '', lastName: '', email: '', phone: '',
  shippingMethod: 'home', address1: '', address2: '',
  state: 'Federal Capital Territory (FCT)',
  deliveryArea: '', deliveryFee: 0,
};

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  ...DEFAULT,

  setField: (field, value) => {
    set({ [field]: value } as Pick<CheckoutState, typeof field>);
    if (field === 'deliveryArea' || field === 'shippingMethod') {
      get().updateDeliveryFee();
    }
  },

  reset: () => set(DEFAULT),

  updateDeliveryFee: () => {
    const { shippingMethod, deliveryArea } = get();
    if (shippingMethod === 'pickup') { set({ deliveryFee: 0 }); return; }
    if (!deliveryArea) { set({ deliveryFee: 0 }); return; }
    const fee = AbujaDeliveryFees[deliveryArea] ?? 8000;
    set({ deliveryFee: fee });
  },
}));