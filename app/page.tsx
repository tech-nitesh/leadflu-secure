"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { LeadCard } from '@/components/lead-card';
import { LeadFluLogo } from '@/components/logo';
import { UserCircle2, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function SkeletonCard() {
  return (
    <div className="p-5 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 animate-pulse mb-4">
      <div className="flex justify-between mb-3">
        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        <div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-12 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>
    </div>
  );
}

export default function Home() {
  const { leads, currentUser, fetchLeadsFromApi, leadsLoadedAt } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
      if (leadsLoadedAt) {
        setLoaded(true);
        fetchLeadsFromApi();
      } else {
        fetchLeadsFromApi().then(() => setLoaded(true));
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [fetchLeadsFromApi, leadsLoadedAt]);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const refresh = async () => {
    setRefreshing(true);
    await fetchLeadsFromApi(true);
    setLoaded(true);
    setRefreshing(false);
  };

  const hotLeads = leads.filter(l => l.leadType === 'HOT' || l.leadType === 'FEATURED');
  const otherLeads = leads.filter(l => l.leadType !== 'HOT' && l.leadType !== 'FEATURED');
  const visible = otherLeads.slice(0, visibleCount);

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
            <p className="font-semibold text-sm">{currentUser?.name || currentUser?.username || 'Guest User'}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} title="Refresh leads" className="rounded-full hover:bg-white/20 dark:hover:bg-white/10">
          <RefreshCw className={`w-5 h-5 text-zinc-700 dark:text-zinc-300 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {!loaded ? (
        <div className="px-6 pt-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 px-8">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-2">No gigs yet</h2>
          <p className="text-sm text-zinc-500 max-w-xs">New opportunities are added regularly. Check back soon.</p>
        </div>
      ) : (
        <>
          {hotLeads.length > 0 && (
            <>
              <div className="px-6 mt-6 mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Top Opportunities
                </h2>
              </div>

              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-6 pb-6 pt-2 gap-4" style={{ scrollbarWidth: 'none' }}>
                {hotLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} featured />
                ))}
              </div>
            </>
          )}

          <div className="px-6 mt-2">
            <h2 className="text-lg font-bold mb-4">Latest Leads</h2>
            <div className="flex flex-col gap-0">
              {visible.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
              {otherLeads.length === 0 && (
                <p className="text-center text-sm text-zinc-500 py-10">No recent leads found.</p>
              )}
              {visible.length < otherLeads.length && (
                <Button variant="outline" className="rounded-full mt-4 bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10" onClick={() => setVisibleCount((c) => c + 12)}>
                  Load more
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
