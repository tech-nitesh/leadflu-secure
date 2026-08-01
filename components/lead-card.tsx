"use client";
import React from 'react';
import { Lead } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Bookmark, Youtube, Instagram, Headphones, MonitorPlay, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import Link from 'next/link';

const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  switch (platform) {
    case 'YouTube': return <Youtube className={className} />;
    case 'Instagram': return <Instagram className={className} />;
    case 'Podcast': return <Headphones className={className} />;
    default: return <MonitorPlay className={className} />;
  }
};

export function LeadCard({ lead, featured = false }: { lead: Lead, featured?: boolean }) {
  const { currentUser, saveLead, unsaveLead } = useStore();
  const isSaved = currentUser?.savedLeads.includes(lead.id);
  const [formattedTime, setFormattedTime] = React.useState<string>('');

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const d = typeof lead.createdAt === 'number' || typeof lead.createdAt === 'string' ? new Date(lead.createdAt) : lead.createdAt;
        if (d && !isNaN(new Date(d).getTime())) {
          setFormattedTime(formatDistanceToNow(d, { addSuffix: true }));
        }
      } catch {
        setFormattedTime('');
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [lead.createdAt]);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) return; // or show login modal
    if (isSaved) unsaveLead(lead.id);
    else saveLead(lead.id);
  };

  return (
    <Link href={`/lead/${lead.id}`}>
      <div className={cn(
        "p-5 rounded-3xl transition-all duration-300 shadow-xl active:scale-[0.98]",
        "bg-gradient-to-br from-white/40 to-white/10 border border-white/40 backdrop-blur-xl",
        "dark:from-white/10 dark:to-white/5 dark:border-white/10",
        featured ? "min-w-[280px] snap-center" : "mb-4"
      )}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md flex items-center",
              lead.accessType === 'PRO' 
                ? "bg-black/5 dark:bg-black/40 text-blue-600 dark:text-blue-300 border-black/10 dark:border-white/5"
                : "bg-black/5 dark:bg-black/40 text-zinc-600 dark:text-zinc-300 border-black/10 dark:border-white/5"
            )}>
              {lead.accessType === 'PRO' && <Lock className="w-3 h-3 mr-1" />}
              {lead.accessType}
            </div>
            {lead.leadType === 'HOT' && (
              <div className="px-3 py-1 rounded-full bg-white text-rose-600 dark:text-blue-900 text-xs font-bold shadow-sm flex items-center">
                <Zap className="w-3 h-3 mr-1 fill-current" />
                HOT
              </div>
            )}
            {lead.leadType === 'FEATURED' && (
              <div className="px-3 py-1 rounded-full bg-white text-amber-600 dark:text-blue-900 text-xs font-bold shadow-sm">
                FEATURED
              </div>
            )}
          </div>
          <button onClick={toggleSave} className="p-1">
            <Bookmark className={cn(
              "w-5 h-5 transition-colors",
              isSaved 
                ? "fill-blue-500 text-blue-500" 
                : "text-zinc-400 dark:text-white/50 hover:text-zinc-700 dark:hover:text-white"
            )} />
          </button>
        </div>
        
        <h3 className={cn("font-medium leading-snug mb-2 text-zinc-900 dark:text-white/90", featured ? "text-lg line-clamp-2" : "text-base line-clamp-2")}>
          {lead.title}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-white/50 mb-4 font-light">
          <PlatformIcon platform={lead.platform} className="w-4 h-4 opacity-70" /> {lead.platform} • {lead.category}
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <div className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5">
            <p className="text-[10px] text-zinc-500 dark:text-white/50 mb-0.5 uppercase tracking-wide">Budget</p>
            <p className="font-semibold text-zinc-900 dark:text-blue-100">{lead.budgetString}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-zinc-400 dark:text-white/40 mb-1">{formattedTime || 'Recently'}</p>
             <div className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5 py-1.5 text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">View details</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
