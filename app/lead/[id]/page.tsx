"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bookmark, Lock, Mail, MessageCircle, Share2, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getSanitizedLead, canAccessLeadContact } from '@/lib/security';
import { whatsappLink } from '@/lib/whatsapp';

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { leads, currentUser, saveLead, unsaveLead } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return null;

  const rawLead = leads.find(l => l.id === id);

  if (!rawLead) {
    return <div className="p-6 text-center mt-20">Lead not found.</div>;
  }

  const isSaved = currentUser?.savedLeads.includes(rawLead.id);
  const isLocked = !canAccessLeadContact(rawLead, currentUser);
  const lead = getSanitizedLead(rawLead, currentUser);

  const toggleSave = () => {
    if (!currentUser) {
      router.push('/profile');
      return;
    }
    if (isSaved) unsaveLead(lead.id);
    else saveLead(lead.id);
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(lead.contactDetails.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      window.open(`mailto:${lead.contactDetails.email}`);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: lead.title,
        text: lead.description,
        url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-transparent pb-24">
      <header className="sticky top-0 z-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-b border-white/20 dark:border-white/10 px-4 py-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/20 dark:hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex gap-2 items-center">
          {lead.leadType === 'HOT' && (
            <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 shadow-none border-none">
              <Zap className="w-3 h-3 mr-1 fill-current" /> HOT
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full hover:bg-white/20 dark:hover:bg-white/10" title="Share Lead">
            <Share2 className={cn("w-5 h-5", copied && "text-emerald-500")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleSave} className="rounded-full hover:bg-white/20 dark:hover:bg-white/10" title="Save Lead">
            <Bookmark className={cn("w-5 h-5", isSaved && "fill-blue-500 text-blue-500")} />
          </Button>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold leading-tight mb-4">{lead.title}</h1>
        
        <div className="flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-300 font-medium items-center mb-6">
          <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20">{lead.platform}</span>
          <span className="text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full border border-black/5 dark:border-white/5">{lead.category}</span>
          <span className="opacity-50">•</span>
          <span className="opacity-70">{formatDistanceToNow(lead.createdAt, { addSuffix: true })}</span>
        </div>

        <div className="bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 backdrop-blur-md rounded-3xl p-6 mb-8 border border-white/40 dark:border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">Budget</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lead.budgetString}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider text-[10px]">Currency</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{lead.currency}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">Job Description</h3>
          <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {lead.description}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">Software Requirements</h3>
          <div className="flex flex-wrap gap-2">
            {lead.softwareRequired.map(sw => (
              <Badge key={sw} variant="outline" className="px-4 py-1.5 bg-white/40 dark:bg-white/5 backdrop-blur-sm border-white/40 dark:border-white/10 rounded-xl font-medium">
                {sw}
              </Badge>
            ))}
          </div>
        </div>

        <div className="relative">
          <h3 className="text-lg font-bold mb-4">Contact Information</h3>
          
          <div className={cn("space-y-3", isLocked && "filter blur-[6px] select-none pointer-events-none")}>
            <div className="flex items-center gap-4 p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Email</p>
                <p className="font-medium text-sm sm:text-base">{isLocked ? 'cl****@gmail.com' : lead.contactDetails.email}</p>
              </div>
              {!isLocked && (
                <Button variant="secondary" size="sm" onClick={handleCopyEmail} className="rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/5">
                  {emailCopied ? 'Copied!' : 'Copy'}
                </Button>
              )}
            </div>
            
            {lead.contactDetails.whatsapp && (
              <div className="flex items-center gap-4 p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">WhatsApp</p>
                  <p className="font-medium text-sm sm:text-base">{isLocked ? '+1 (***) ***-****' : lead.contactDetails.whatsapp}</p>
                </div>
              </div>
            )}
          </div>

          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/20 dark:bg-zinc-950/20 backdrop-blur-sm rounded-3xl">
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-center max-w-[280px] w-full mx-4 border border-white/40 dark:border-white/10">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg mb-2">Pro Member Only</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Unlock this lead&apos;s contact details by requesting a PRO membership.</p>
                {(() => {
                  const wa = whatsappLink(
                    `Hi Nitesh, I want to access PRO membership and unlock this lead. Lead ID: ${lead.id} - ${lead.title}`
                  );
                  return wa ? (
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full py-6 font-semibold shadow-lg shadow-green-500/25">
                      <a href={wa} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-5 h-5 mr-2" /> Unlock on WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 font-semibold shadow-lg shadow-blue-500/25" onClick={() => router.push('/profile')}>
                      Upgrade to Pro
                    </Button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
