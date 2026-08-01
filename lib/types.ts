export type Role = 'Guest' | 'Free' | 'Pro' | 'Admin';
export type Plan = 'FREE' | 'PRO';
export type Platform = 'YouTube' | 'Instagram' | 'TikTok' | 'Podcast' | 'Corporate' | 'Other';
export type Category = 'Shorts' | 'Long Form' | 'Vlog' | 'Documentary' | 'Commercial' | 'Other';
export type LeadStatus = 'Active' | 'Draft' | 'Archived';
export type LeadType = 'HOT' | 'FEATURED' | 'FREE' | 'PRO';

export interface User {
  id: string;
  name: string | null;
  username?: string | null;
  email: string | null;
  avatar: string | null;
  role: Role;
  plan: Plan;
  expiryDate?: number;
  savedLeads: string[];
  unlockedLeads: string[];
}

export interface Lead {
  id: string;
  title: string;
  description: string;
  budgetNumeric: number;
  budgetString: string;
  currency: string;
  platform: Platform;
  category: Category;
  softwareRequired: string[];
  leadType: LeadType;
  accessType: Plan;
  contactDetails: {
    email: string;
    whatsapp?: string;
    socialLinks?: string[];
  };
  status: LeadStatus;
  createdAt: number;
}
