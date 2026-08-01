"use client";
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Trash2, Pencil, X } from 'lucide-react';
import { Lead } from '@/lib/types';
import { format } from 'date-fns';
import { getFirebaseIdToken } from '@/lib/firebase';

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
    contactDetails: { email: '' },
    status: 'Active',
    deadline: undefined,
  });
  const [formData, setFormData] = useState<Partial<Lead>>(emptyForm);

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
        setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description,
          budgetNumeric: data.budgetNumeric,
          budgetString: data.budgetString,
          platform: data.platform,
          category: data.category,
          softwareRequired: data.softwareRequired,
          leadType: data.leadType,
          accessType: data.accessType,
          contactDetails: {
            email: data.contactEmail || prev.contactDetails?.email || '',
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
      contactDetails: lead.contactDetails || { email: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormError(null);
    setFormData({ ...emptyForm });
  };

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

  const deadlineDateStr = formData.deadline
    ? (() => {
        try { return new Date(formData.deadline).toISOString().slice(0, 10); } catch { return ''; }
      })()
    : '';

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
              {leads.map(lead => (
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
              {leads.length === 0 && <p className="text-zinc-500 text-sm">No leads found.</p>}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget (Numeric)</Label>
                  <Input type="number" required value={formData.budgetNumeric} onChange={e => setFormData({...formData, budgetNumeric: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Budget String</Label>
                  <Input required value={formData.budgetString} onChange={e => setFormData({...formData, budgetString: e.target.value})} placeholder="$500 total" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Input required value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value as any})} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                    value={formData.leadType} 
                    onChange={e => setFormData({...formData, leadType: e.target.value as any})}
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="HOT">HOT</option>
                    <option value="FEATURED">FEATURED</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Access Required</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                    value={formData.accessType} 
                    onChange={e => setFormData({...formData, accessType: e.target.value as any})}
                  >
                    <option value="FREE">FREE (Anyone)</option>
                    <option value="PRO">PRO (Paid Only)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Apply by deadline (optional)</Label>
                <Input
                  type="date"
                  value={deadlineDateStr}
                  onChange={e => setFormData({...formData, deadline: e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined})}
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Label>Client Email</Label>
                <Input type="email" required value={formData.contactDetails?.email || ''} onChange={e => setFormData({...formData, contactDetails: { ...formData.contactDetails!, email: e.target.value }})} />
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
