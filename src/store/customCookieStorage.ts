'use client';

import Cookies from 'js-cookie';
import { StateStorage } from 'zustand/middleware';

export const cookieStorage: StateStorage = {
  getItem: (name: string) => {
    return Cookies.get(name) ?? null;
  },
  setItem: (name: string, value: string) => {
    Cookies.set(name, value, { expires: 7, sameSite: 'lax' });
  },
  removeItem: (name: string) => {
    Cookies.remove(name);
  },
};