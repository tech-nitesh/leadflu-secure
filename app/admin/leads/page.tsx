"use client";
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Trash2, Pencil, X, Search } from 'lucide-react';
import { Lead } from '@/lib/types';
import { format } from 'date-fns';
import { getFirebaseIdToken } from '@/lib/firebase';

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Corporate', 'Other'];
const CATEGORIES = ['Shorts', 'Long Form', 'Vlog', 'Documentary', 'Commercial', 'Other'];
const LEAD_TYPES = ['HOT', 'FEATURED', 'FREE', 'PRO'];

function toWebsite(socialLinks?: string[]): string {
  return Array.isArray(socialLinks) && socialLinks.length > 0 ? socialLinks[0] : '';
}

export default function AdminLeadsPage() {
  const { leads, addLead, updateLeadApi, deleteLead } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [rawMessage, setRawMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [emptyForm, setEmptyForm] = useState<Partial<Lead>>({
    title: '',
    description: '',
    budgetNumeric: 0,
    budgetString: '',
    currency: 'USD',
    platform: 'Other',
    category: 'Other',
    softwareRequired: [],
    leadType: 'FREE',
    accessType: 'FREE',
    contactDetails: { email: '', whatsapp: '', socialLinks: [] },
    status: 'Active',
  });
  const [formData, setFormData] = useState<Partial<Lead>>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
      const d = typeof dateVal === 'number' || typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const handleAiFill = async () => {
    if (!rawMessage) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const token = await getFirebaseIdToken();
      if (!token) {
        setAiError('You must be signed in to use AI extraction.');
        return;
      }
      const res = await fetch('/api/leads/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: rawMessage })
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || `Request failed (${res.status}).`);
        return;
      }
      if (data.title) {
        const hasBudget = typeof data.budgetNumeric === 'number' && data.budgetNumeric >= 0;
        const contactEmail = typeof data.contactEmail === 'string' && data.contactEmail ? data.contactEmail : null;
        const contactWhatsapp = typeof data.contactWhatsapp === 'string' && data.contactWhatsapp ? data.contactWhatsapp : null;
        const website = typeof data.website === 'string' && data.website ? data.website : null;
        setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description,
          ...(hasBudget
            ? { budgetNumeric: data.budgetNumeric, budgetString: data.budgetString || '' }
            : {}),
          platform: data.platform,
          category: data.category,
          softwareRequired: data.softwareRequired,
          leadType: data.leadType,
          accessType: data.accessType,
          contactDetails: {
            email: contactEmail || prev.contactDetails?.email || '',
            whatsapp: contactWhatsapp || prev.contactDetails?.whatsapp || '',
            socialLinks: website ? [website] : (prev.contactDetails?.socialLinks || []),
          },
        }));
      }
    } catch (err) {
      console.error(err);
      setAiError('AI extraction failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title) return;
    const contact = formData.contactDetails;
    const hasAnyContact = Boolean(
      contact?.email?.trim() ||
      contact?.whatsapp?.trim() ||
      contact?.socialLinks?.some((s) => s && s.trim())
    );
    if (!hasAnyContact) {
      setFormError('Add at least one contact detail (email, number, or website).');
      return;
    }
    try {
      if (editingId) {
        const updated = await updateLeadApi(editingId, formData);
        if (!updated) {
          setFormError('Update failed. Please try again.');
          return;
        }
      } else {
        await addLead(formData as any);
      }
      setFormData({ ...emptyForm });
      setRawMessage('');
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save lead.');
    }
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setFormError(null);
    setFormData({
      ...lead,
      softwareRequired: Array.isArray(lead.softwareRequired) ? lead.softwareRequired : [],
      contactDetails: lead.contactDetails
        ? { email: lead.contactDetails.email || '', whatsapp: lead.contactDetails.whatsapp || '', socialLinks: lead.contactDetails.socialLinks || [] }
        : { email: '', whatsapp: '', socialLinks: [] },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormError(null);
    setFormData({ ...emptyForm });
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredLeads = leads.filter(
    (lead) => !q || `${lead.title} ${lead.id}`.toLowerCase().includes(q)
  );

  const handleDeleteClick = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await deleteLead(id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete lead.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Lead Manager</h1>
        <p className="text-zinc-500">Create, edit, and manage all leads on the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Existing Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search by title or lead ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-full bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              {filteredLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{lead.title}</h4>
                    <p className="text-sm text-zinc-500">{safeFormatDate(lead.createdAt)} • {lead.budgetString}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{lead.leadType}</Badge>
                      <Badge variant="outline" className="text-xs">{lead.platform}</Badge>
                      {lead.deadline && <Badge variant="outline" className="text-xs">Apply by {safeFormatDate(lead.deadline)}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {confirmDeleteId === lead.id && <span className="text-xs text-red-500 font-medium">Confirm?</span>}
                    <Button variant="ghost" size="icon" onClick={() => startEdit(lead)} aria-label={`Edit ${lead.title}`} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(lead.id)} aria-label={`Delete ${lead.title}`} className={confirmDeleteId === lead.id ? 'text-white bg-red-500 hover:bg-red-600' : 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredLeads.length === 0 && <p className="text-zinc-500 text-sm">{q ? 'No leads match your search.' : 'No leads found.'}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 mb-6 rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              {editingId ? 'Edit Lead' : 'Create Lead with AI'}
            </CardTitle>
            <CardDescription>{editingId ? 'Update the details of this lead.' : 'Paste a raw client message to automatically extract details using Gemini.'}</CardDescription>
            <div className="flex gap-2 mt-4">
              <Textarea 
                placeholder="Paste client email or discord message here..." 
                value={rawMessage} 
                onChange={e => setRawMessage(e.target.value)} 
                className="min-h-[100px]"
              />
            </div>
            <Button onClick={handleAiFill} disabled={isAiLoading || !rawMessage} className="mt-3 w-full gap-2 bg-indigo-500 hover:bg-indigo-600 text-white border-none">
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAiLoading ? 'Analyzing with Gemini...' : 'Auto-Fill Fields'}
            </Button>
            {aiError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-2">
                {aiError}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="min-h-[150px]" />
              </div>

              <div className="space-y-2">
                <Label>Cost / price</Label>
                <Input value={formData.budgetString} onChange={e => setFormData({...formData, budgetString: e.target.value})} placeholder="e.g. $150 per video" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                    value={formData.platform}
                    onChange={e => setFormData({...formData, platform: e.target.value as any})}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as any})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lead Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                  value={formData.leadType} 
                  onChange={e => setFormData({...formData, leadType: e.target.value as any})}
                >
                  {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold">Client Contact <span className="text-zinc-400 font-normal">(at least one required)</span></p>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.contactDetails?.email || ''} onChange={e => setFormData({...formData, contactDetails: { ...formData.contactDetails!, email: e.target.value }})} />
                </div>
                <div className="space-y-2">
                  <Label>Phone / WhatsApp Number</Label>
                  <Input value={formData.contactDetails?.whatsapp || ''} onChange={e => setFormData({...formData, contactDetails: { ...formData.contactDetails!, whatsapp: e.target.value }})} placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-2">
                  <Label>Website / Source Link</Label>
                  <Input value={toWebsite(formData.contactDetails?.socialLinks)} onChange={e => setFormData({...formData, contactDetails: { ...formData.contactDetails!, socialLinks: e.target.value.trim() ? [e.target.value.trim()] : [] }})} placeholder="https://..." />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="w-full mt-4">{editingId ? 'Save Changes' : 'Create Lead'}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit} className="mt-4 gap-2">
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
