"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { LeadCard } from '@/components/lead-card';
import { LeadFluLogo } from '@/components/logo';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Platform } from '@/lib/types';

const PLATFORMS: Platform[] = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Corporate', 'Other'];

export default function SearchPage() {
  const { leads } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'All'>('All');

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const filteredLeads = leads.filter(l => {
    const matchesQuery = l.title.toLowerCase().includes(query.toLowerCase()) || l.description.toLowerCase().includes(query.toLowerCase());
    const matchesPlatform = selectedPlatform === 'All' || l.platform === selectedPlatform;
    return matchesQuery && matchesPlatform;
  });

  return (
    <main className="flex flex-col min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <LeadFluLogo variant="full" size="sm" />
          <span className="text-xs text-zinc-500 font-medium">Discover Gigs</span>
        </div>
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3.5 w-5 h-5 text-zinc-400" />
          <Input 
            type="text" 
            placeholder="Search leads, keywords, editors..." 
            className="pl-11 pr-10 rounded-2xl bg-white/50 dark:bg-white/5 border-white/40 dark:border-white/10 backdrop-blur-md focus-visible:ring-1 focus-visible:ring-blue-500" 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="absolute right-3.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar gap-2 mt-4 pb-2" style={{ scrollbarWidth: 'none' }}>
          <Badge 
            variant={selectedPlatform === 'All' ? 'default' : 'secondary'} 
            className={`cursor-pointer whitespace-nowrap px-4 py-1.5 rounded-full font-medium transition-all ${
              selectedPlatform === 'All' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white/40 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border-white/40 dark:border-white/10'
            }`}
            onClick={() => setSelectedPlatform('All')}
          >
            All
          </Badge>
          {PLATFORMS.map(p => (
            <Badge 
              key={p} 
              variant={selectedPlatform === p ? 'default' : 'secondary'} 
              className={`cursor-pointer whitespace-nowrap px-4 py-1.5 rounded-full font-medium transition-all ${
                selectedPlatform === p 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-white/40 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border-white/40 dark:border-white/10'
              }`}
              onClick={() => setSelectedPlatform(p)}
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm text-zinc-500 mb-4">{filteredLeads.length} results found</p>
        <div className="flex flex-col gap-0">
          {filteredLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </div>
    </main>
  );
}
