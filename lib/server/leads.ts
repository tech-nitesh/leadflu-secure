import { NextResponse } from 'next/server';
import { adminDb } from './firebase-admin';
import { AuthContext } from './auth';
import { Lead, User } from '@/lib/types';
import { getSanitizedLead, validateLeadInput } from '@/lib/security';

const LEADS_COLLECTION = 'leads';

function getDb() {
  if (!adminDb) {
    throw new Error('Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.');
  }
  return adminDb;
}

function toUser(ctx: AuthContext): User {
  return {
    id: ctx.user.uid,
    name: null,
    email: ctx.user.email,
    avatar: null,
    role: ctx.role,
    plan: ctx.plan,
    savedLeads: [],
    unlockedLeads: [],
  };
}

function canSeeContact(lead: Lead, ctx: AuthContext): boolean {
  if (lead.accessType === 'FREE') return true;
  return ctx.isAdmin || ctx.plan === 'PRO';
}

export async function listLeads(ctx: AuthContext): Promise<Lead[]> {
  const snapshot = await getDb()
    .collection(LEADS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .get();

  const leads: Lead[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as Lead;
    leads.push({ ...data, id: doc.id });
  });

  return leads.map((lead) => {
    if (canSeeContact(lead, ctx)) return lead;
    return getSanitizedLead(lead, toUser(ctx));
  });
}

export async function getLead(id: string, ctx: AuthContext): Promise<Lead | null> {
  const doc = await getDb().collection(LEADS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const lead = { ...(doc.data() as Lead), id: doc.id };
  if (canSeeContact(lead, ctx)) return lead;
  return getSanitizedLead(lead, toUser(ctx));
}

export async function createLead(data: Partial<Lead>): Promise<{ lead: Lead | null; error?: NextResponse }> {
  const { valid, errors } = validateLeadInput(data);
  if (!valid) {
    return { lead: null, error: NextResponse.json({ error: errors.join(' '), success: false }, { status: 400 }) };
  }

  const docRef = getDb().collection(LEADS_COLLECTION).doc();
  const now = Date.now();
  const lead: Lead = {
    id: docRef.id,
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    budgetNumeric: Number(data.budgetNumeric) || 0,
    budgetString: data.budgetString?.trim() || `$${Number(data.budgetNumeric) || 0}`,
    currency: data.currency || 'USD',
    platform: data.platform || 'Other',
    category: data.category || 'Other',
    softwareRequired: Array.isArray(data.softwareRequired) ? data.softwareRequired : [],
    leadType: data.leadType || 'FREE',
    accessType: data.accessType || 'FREE',
    contactDetails: {
      email: data.contactDetails?.email?.trim() || '',
      whatsapp: data.contactDetails?.whatsapp?.trim() || undefined,
      socialLinks: data.contactDetails?.socialLinks,
    },
    status: data.status || 'Active',
    createdAt: now,
    deadline: typeof data.deadline === 'number' ? data.deadline : undefined,
  };

  await docRef.set(lead);
  return { lead };
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead | null> {
  const docRef = getDb().collection(LEADS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const existing = doc.data() as Lead;
  const updated: Lead = {
    ...existing,
    ...data,
    id,
    title: data.title !== undefined ? data.title.trim() : existing.title,
    description: data.description !== undefined ? data.description.trim() : existing.description,
    contactDetails: data.contactDetails
      ? {
          email: data.contactDetails.email?.trim() || existing.contactDetails.email,
          whatsapp: data.contactDetails.whatsapp !== undefined
            ? data.contactDetails.whatsapp.trim()
            : existing.contactDetails.whatsapp,
          socialLinks: data.contactDetails.socialLinks !== undefined
            ? data.contactDetails.socialLinks
            : existing.contactDetails.socialLinks,
        }
      : existing.contactDetails,
  };

  await docRef.set(updated);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const docRef = getDb().collection(LEADS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;
  await docRef.delete();
  return true;
}
