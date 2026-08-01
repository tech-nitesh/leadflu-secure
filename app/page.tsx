"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { LeadCard } from '@/components/lead-card';
import { LeadFluLogo } from '@/components/logo';
import { Bell, UserCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  const { leads, currentUser, fetchLeadsFromApi } = useStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
      fetchLeadsFromApi();
    });
    return () => cancelAnimationFrame(handle);
  }, [fetchLeadsFromApi]);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const hotLeads = leads.filter(l => l.leadType === 'HOT' || l.leadType === 'FEATURED');
  const otherLeads = leads.filter(l => l.leadType !== 'HOT' && l.leadType !== 'FEATURED');

  return (
    <main className="flex flex-col min-h-screen pb-24">
      {/* Top Brand Bar */}
      <div className="bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md border-b border-white/20 dark:border-white/10 px-6 py-3 flex justify-between items-center">
        <LeadFluLogo variant="full" size="sm" />
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Editor Gigs
        </span>
      </div>

      <header className="sticky top-0 z-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-b border-white/20 dark:border-white/10 px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-white/40 dark:border-white/10 shadow-sm">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-6 h-6 text-zinc-500" />
              )}
            </div>
          </Link>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Welcome back</p>
            <p className="font-semibold text-sm">{currentUser?.name || 'Guest User'}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-white/20 dark:hover:bg-white/10">
            <Bell className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950" />
          </Button>
        </div>
      </header>

      <div className="px-6 mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          Top Opportunities
        </h2>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-6 pb-6 pt-2 gap-4 -mx-2" style={{ scrollbarWidth: 'none' }}>
        {hotLeads.map(lead => (
          <LeadCard key={lead.id} lead={lead} featured />
        ))}
      </div>

      <div className="px-6 mt-2">
        <h2 className="text-lg font-bold mb-4">Latest Leads</h2>
        <div className="flex flex-col gap-0">
          {otherLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          {otherLeads.length === 0 && (
            <p className="text-center text-sm text-zinc-500 py-10">No recent leads found.</p>
          )}
        </div>
      </div>
    </main>
  );
}
