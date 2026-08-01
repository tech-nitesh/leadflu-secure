"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { LeadCard } from '@/components/lead-card';
import { LeadFluLogo } from '@/components/logo';

export default function SavedLeads() {
  const { leads, currentUser } = useStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen p-6 justify-center items-center text-center">
        <LeadFluLogo variant="app-icon" size="lg" className="mb-4" />
        <h2 className="text-xl font-bold mb-2">Sign in to view saved leads</h2>
        <p className="text-zinc-500 mb-6">Create an account to bookmark your favorite opportunities.</p>
        <a href="/profile" className="text-blue-500 hover:underline">Go to Profile</a>
      </div>
    );
  }

  const savedLeadsData = leads.filter(l => currentUser.savedLeads.includes(l.id));

  return (
    <main className="flex flex-col min-h-screen pb-24 p-6">
      <div className="flex items-center justify-between mb-6">
        <LeadFluLogo variant="full" size="sm" />
        <span className="text-xs text-zinc-500 font-medium">Saved Bookmarks</span>
      </div>
      <div className="flex flex-col gap-0">
        {savedLeadsData.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {savedLeadsData.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p>No saved leads yet.</p>
            <p className="text-sm mt-2">Bookmark opportunities to view them here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
