import { Lead, User } from './types';

export function maskEmail(email?: string): string {
  return email ? '•••••@•••••.com' : '•••••';
}

export function maskPhone(phone?: string): string {
  return phone ? '••••••••••' : '+•• ••• ••• ••••';
}

export function canAccessLeadContact(lead: Lead, user: User | null): boolean {
  if (!lead) return false;
  // If lead is FREE, anyone can access
  if (lead.accessType === 'FREE') return true;
  // If lead is PRO, only PRO or Admin users can access
  if (!user) return false;
  return user.role === 'Admin' || user.plan === 'PRO';
}

export function getSanitizedLead(lead: Lead, user: User | null): Lead {
  if (canAccessLeadContact(lead, user)) {
    return lead;
  }

  // Mask contact details for unauthorized users
  return {
    ...lead,
    contactDetails: {
      email: maskEmail(lead.contactDetails.email),
      whatsapp: lead.contactDetails.whatsapp ? maskPhone(lead.contactDetails.whatsapp) : undefined,
    },
  };
}

export function validateLeadInput(leadData: Partial<Lead>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!leadData.title || leadData.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long.');
  }

  if (!leadData.description || leadData.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long.');
  }

  if (leadData.budgetNumeric === undefined || leadData.budgetNumeric < 0 || isNaN(Number(leadData.budgetNumeric))) {
    errors.push('A valid non-negative numeric budget is required.');
  }

  if (!leadData.platform) {
    errors.push('Platform is required.');
  }

  if (!leadData.category) {
    errors.push('Category is required.');
  }

  if (!leadData.contactDetails?.email) {
    errors.push('Contact email is required.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.contactDetails.email)) {
      errors.push('Please enter a valid contact email address.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
