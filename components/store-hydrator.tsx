"use client";
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export function StoreHydrator() {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  return null;
}
