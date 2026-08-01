"use client";
import React, { useEffect, useState } from 'react';
import { onToast } from '@/lib/toast';

export function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onToast((msg) => {
      setMessage(msg);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2600);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium px-5 py-3 rounded-full shadow-2xl whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis animate-in fade-in slide-in-from-bottom-4">
      {message}
    </div>
  );
}
