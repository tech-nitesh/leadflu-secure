"use client";
import React from 'react';
import { Lead } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Bookmark, Youtube, Instagram, Headphones, MonitorPlay, Zap, Lock, Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { canAccessLeadContact } from '@/lib/security';

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
  const router = useRouter();
  const isSaved = currentUser?.savedLeads.includes(lead.id);
  const isLocked = !canAccessLeadContact(lead, currentUser);
  const contactItems: { icon: React.ComponentType<{ className?: string }>; text: string }[] = [];
  if (lead.contactDetails?.email) contactItems.push({ icon: Mail, text: lead.contactDetails.email });
  if (lead.contactDetails?.whatsapp) contactItems.push({ icon: MessageCircle, text: lead.contactDetails.whatsapp });
  const platformLabel = lead.platform && lead.platform !== 'Other' ? lead.platform : '';
  const categoryLabel = lead.category && lead.category !== 'Other' ? lead.category : '';
  const showMeta = Boolean(platformLabel || categoryLabel);
  const maskedEmail = lead.contactDetails?.email;
  const maskedWhatsapp = lead.contactDetails?.whatsapp;
  const hasHiddenContact = Boolean(
    (maskedEmail && maskedEmail !== '•••••') ||
    (maskedWhatsapp && maskedWhatsapp !== '+•• ••• ••• ••••')
  );
  const [formattedTime, setFormattedTime] = React.useState<string>('');
  const [deadlineText, setDeadlineText] = React.useState<string>('');

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
      if (lead.deadline) {
        try {
          const dl = new Date(lead.deadline);
          if (!isNaN(dl.getTime())) {
            setDeadlineText(formatDistanceToNow(dl, { addSuffix: true }));
          }
        } catch {
          setDeadlineText('');
        }
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [lead.createdAt, lead.deadline]);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast('Sign in to save leads');
      router.push(`/profile?next=${encodeURIComponent(`/lead/${lead.id}`)}`);
      return;
    }
    if (isSaved) unsaveLead(lead.id);
    else saveLead(lead.id);
  };

  return (
    <Link href={`/lead/${lead.id}`} className="block h-full">
      <div className={cn(
        "h-full p-5 rounded-3xl transition-all duration-300 shadow-xl active:scale-[0.98]",
        "bg-gradient-to-br from-white/40 to-white/10 border border-white/40 backdrop-blur-xl",
        "dark:from-white/10 dark:to-white/5 dark:border-white/10",
        featured ? "w-[280px] shrink-0 snap-start" : "mb-4"
      )}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
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
            {lead.leadType === 'PRO' && (
              <div className="px-3 py-1 rounded-full bg-black/5 dark:bg-black/40 text-blue-600 dark:text-blue-300 border border-black/10 dark:border-white/5 text-xs font-medium flex items-center">
                <Lock className="w-3 h-3 mr-1" /> PRO
              </div>
            )}
            {lead.leadType === 'FREE' && (
              <div className="px-3 py-1 rounded-full bg-black/5 dark:bg-black/40 text-zinc-600 dark:text-zinc-300 border border-black/10 dark:border-white/5 text-xs font-medium">
                FREE
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
        
        <h3 className={cn("font-medium leading-snug mb-2 text-zinc-900 dark:text-white/90 truncate", featured ? "text-lg" : "text-base")}>
          {lead.title}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-white/50 mb-3 font-light min-h-[1.25rem]">
          {showMeta && (
            <>
              {platformLabel && (
                <>
                  <PlatformIcon platform={lead.platform} className="w-4 h-4 opacity-70" />
                  {platformLabel}
                </>
              )}
              {platformLabel && categoryLabel && <span>•</span>}
              {categoryLabel}
            </>
          )}
        </div>

        {lead.description && (
          <p className="text-sm text-zinc-500 dark:text-white/50 line-clamp-2 mb-3 font-light leading-relaxed">
            {lead.description}
          </p>
        )}

        {lead.deadline && (
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20 text-xs font-medium">
            <Zap className="w-3 h-3" /> Apply by {deadlineText}
          </div>
        )}

        {isLocked && hasHiddenContact ? (
          <div className="mb-4 relative">
            <div className="flex items-center gap-3 p-3.5 pb-7 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10">
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-3/4 rounded-full bg-zinc-300/80 dark:bg-zinc-600/80 blur-[3px]" />
                <div className="h-2.5 w-1/2 rounded-full bg-zinc-300/80 dark:bg-zinc-600/80 blur-[3px]" />
              </div>
              <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
            </div>
            <p className="absolute bottom-1.5 inset-x-0 text-center text-[11px] font-medium text-zinc-500 dark:text-white/50 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Contact details locked - PRO members only
            </p>
          </div>
        ) : contactItems.length > 0 ? (
          <div className="mb-4 flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10">
            {contactItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-white/80 min-w-0">
                <item.icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{item.text}</span>
              </div>
            ))}
          </div>
        ) : null}
        
        <div className="flex items-center justify-between pt-4">
          {lead.budgetString && (
            <div className={cn(
              "flex flex-col items-start text-left rounded-2xl bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5",
              featured ? "px-2.5 py-1.5" : "px-4 py-2"
            )}>
              <p className="text-[10px] text-zinc-500 dark:text-white/50 mb-0.5 uppercase tracking-wide">Budget</p>
              <p className={cn("font-semibold text-zinc-900 dark:text-blue-100", featured ? "text-xs" : "text-sm")}>{lead.budgetString}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 dark:text-white/40 mb-1">{formattedTime || 'Recently'}</p>
            <div className={cn(
              "bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium shadow-lg shadow-blue-500/20 transition-all",
              featured ? "px-3 py-1.5 text-xs" : "px-5 py-1.5 text-sm"
            )}>View details</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
