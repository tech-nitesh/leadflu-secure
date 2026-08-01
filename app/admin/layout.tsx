"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getFirebaseIdToken } from '@/lib/firebase';
import { LayoutDashboard, Users, FileText, Database, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);
  const [serverVerified, setServerVerified] = React.useState(false);
  const [serverChecked, setServerChecked] = React.useState(false);

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      const token = await getFirebaseIdToken();
      if (cancelled) return;
      if (!token) {
        // Firebase auth may still be restoring the session after a refresh.
        attempts += 1;
        if (attempts >= 20) {
          setServerChecked(true);
          return;
        }
        setTimeout(check, 250);
        return;
      }
      try {
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setServerVerified(data?.user?.role === 'Admin');
          } else {
            setServerVerified(false);
          }
          setServerChecked(true);
        }
      } catch {
        if (!cancelled) {
          setServerVerified(false);
          setServerChecked(true);
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, currentUser?.id]);

  if (!isMounted || !serverChecked) {
    return <div className="p-6">Loading...</div>;
  }

  if (!serverVerified || currentUser?.role !== 'Admin') {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-zinc-500 mb-6">You do not have permission to view this page.</p>
          <Link href="/" className="text-blue-500 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
    { href: '/admin/leads', icon: FileText, label: 'Lead Manager' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/sync', icon: Database, label: 'Sheets Sync' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans w-full !max-w-none">
      <style>{`
        /* Override mobile wrapper for admin */
        body > div { max-width: 100% !important; border-radius: 0 !important; box-shadow: none !important; display: flex; }
      `}</style>
      
      {/* Header / Sidebar */}
      <aside className="w-full lg:w-64 bg-white dark:bg-zinc-900 lg:border-r border-b lg:border-b-0 border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-col shrink-0 lg:min-h-screen">
        <div className="p-4 lg:p-6 flex items-center justify-between lg:block border-b lg:border-b-0 border-zinc-200 dark:border-zinc-800">
          <h1 className="font-bold text-lg lg:text-xl flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 flex items-center justify-center text-sm">EL</span>
            Admin Pro
          </h1>
          <button 
            onClick={() => router.push('/')}
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/50"
            aria-label="Exit admin"
          >
            <LogOut className="w-4 h-4" />
            Exit
          </button>
        </div>
        
        <nav className="flex-1 lg:flex-none lg:block overflow-x-auto lg:overflow-visible p-2 lg:p-4 flex lg:flex-col gap-1 lg:space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium whitespace-nowrap",
                  isActive 
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-2 lg:p-4 border-t lg:border-t-0 border-zinc-200 dark:border-zinc-800 hidden lg:block">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/50 w-full"
          >
            <LogOut className="w-5 h-5" />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden lg:h-[100dvh]">
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
