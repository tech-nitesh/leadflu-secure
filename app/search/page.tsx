"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { LeadCard } from '@/components/lead-card';
import { LeadFluLogo } from '@/components/logo';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Platform, Category } from '@/lib/types';

const PLATFORMS: Platform[] = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Corporate', 'Other'];
const CATEGORIES: Category[] = ['Shorts', 'Long Form', 'Vlog', 'Documentary', 'Commercial', 'Other'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'budget_high', label: 'Budget: high to low' },
  { value: 'budget_low', label: 'Budget: low to high' },
] as const;

function SkeletonCard() {
  return (
    <div className="p-5 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 animate-pulse mb-4">
      <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-3" />
      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="h-12 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
    </div>
  );
}

export default function SearchPage() {
  const { leads, fetchLeadsFromApi } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [sort, setSort] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(async () => {
      setIsMounted(true);
      await fetchLeadsFromApi();
      setLoaded(true);
    });
    return () => cancelAnimationFrame(handle);
  }, [fetchLeadsFromApi]);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  let filteredLeads = leads.filter(l => {
    const matchesQuery = l.title.toLowerCase().includes(query.toLowerCase()) || l.description.toLowerCase().includes(query.toLowerCase());
    const matchesPlatform = selectedPlatform === 'All' || l.platform === selectedPlatform;
    const matchesCategory = selectedCategory === 'All' || l.category === selectedCategory;
    return matchesQuery && matchesPlatform && matchesCategory;
  });

  filteredLeads = [...filteredLeads].sort((a, b) => {
    if (sort === 'budget_high') return (b.budgetNumeric || 0) - (a.budgetNumeric || 0);
    if (sort === 'budget_low') return (a.budgetNumeric || 0) - (b.budgetNumeric || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
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
          <button
            className={`absolute right-3.5 transition-colors ${showFilters ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}
            onClick={() => setShowFilters(v => !v)}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar gap-2 mt-4 pb-2" style={{ scrollbarWidth: 'none' }}>
          {(['All', ...PLATFORMS] as const).map(p => (
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

        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-white/20 dark:border-white/10 pt-3">
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">Category</p>
              <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1" style={{ scrollbarWidth: 'none' }}>
                {(['All', ...CATEGORIES] as const).map(c => (
                  <Badge
                    key={c}
                    variant={selectedCategory === c ? 'default' : 'secondary'}
                    className={`cursor-pointer whitespace-nowrap px-3 py-1 rounded-full text-xs transition-all ${
                      selectedCategory === c
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-white/40 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 border-white/40 dark:border-white/10'
                    }`}
                    onClick={() => setSelectedCategory(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">Sort by</p>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {!loaded ? (
          <SkeletonCard />
        ) : (
          <>
            <p className="text-sm text-zinc-500 mb-4">{filteredLeads.length} results found</p>
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 px-8">
                <div className="w-16 h-16 rounded-full bg-zinc-500/10 text-zinc-500 flex items-center justify-center mb-4">
                  <SearchIcon className="w-7 h-7" />
                </div>
                <h2 className="font-bold mb-1">No matches</h2>
                <p className="text-sm text-zinc-500">Try different keywords or clear your filters.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {filteredLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
