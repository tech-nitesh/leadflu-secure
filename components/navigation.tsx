"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

export function BottomNav() {
  const pathname = usePathname();
  const currentUser = useStore(state => state.currentUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const showAdmin = mounted && currentUser?.role === 'Admin';

  return (
    <nav className="fixed bottom-0 w-full max-w-md mx-auto bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-t border-white/20 dark:border-white/10 pb-safe pb-4 pt-2 px-6 flex justify-between items-center z-50 transition-colors">
      <NavItem href="/" icon={<Home className="w-6 h-6" />} active={pathname === '/'} label="Home" />
      <NavItem href="/search" icon={<Search className="w-6 h-6" />} active={pathname === '/search'} label="Search" />
      <NavItem href="/saved" icon={<Bookmark className="w-6 h-6" />} active={pathname === '/saved'} label="Saved" />
      <NavItem href="/profile" icon={<User className="w-6 h-6" />} active={pathname === '/profile'} label="Profile" />
      {showAdmin && (
        <NavItem href="/admin" icon={<Shield className="w-6 h-6" />} active={pathname.startsWith('/admin')} label="Admin" />
      )}
    </nav>
  );
}

function NavItem({ href, icon, active, label }: { href: string, icon: React.ReactNode, active: boolean, label: string }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 w-16 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors", active && "text-blue-600 dark:text-blue-400")}>
      <div className={cn("p-1.5 rounded-full transition-all duration-300", active ? "bg-blue-50 dark:bg-blue-500/10" : "bg-transparent")}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
