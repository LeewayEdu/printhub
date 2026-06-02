import { create } from 'zustand'

interface FlashSaleStore {
  isActive: boolean
  setIsActive: (v: boolean) => void
}

export const useFlashSaleStore = create<FlashSaleStore>(set => ({
  isActive: false,
  setIsActive: (v) => set({ isActive: v }),
}))