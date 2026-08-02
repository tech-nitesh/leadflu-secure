import { Lead, User } from './types';

export function maskEmail(email?: string): string {
  return email ? '•••••@•••••.com' : '•••••';
}

export function maskPhone(phone?: string): string {
  return phone ? '••••••••••' : '+•• ••• ••• ••••';
}

export function canAccessLeadContact(lead: Lead, user: User | null): boolean {
  if (!lead) return false;
  // FREE and FEATURED leads are open to everyone (HOT/FEATURED are just badges).
  if (lead.leadType === 'FREE' || lead.leadType === 'FEATURED') return true;
  // PRO and HOT leads: only PRO members and the admin can see the contacts.
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

  if (leadData.budgetNumeric !== undefined && (leadData.budgetNumeric < 0 || isNaN(Number(leadData.budgetNumeric)))) {
    errors.push('A valid non-negative numeric budget is required.');
  }

  if (!leadData.platform) {
    errors.push('Platform is required.');
  }

  if (!leadData.category) {
    errors.push('Category is required.');
  }

  const hasAnyContact = Boolean(
    leadData.contactDetails?.email?.trim() ||
    leadData.contactDetails?.whatsapp?.trim() ||
    leadData.contactDetails?.socialLinks?.some((s) => s && s.trim())
  );
  if (!hasAnyContact) {
    errors.push('Add at least one contact detail (email, number, or website).');
  } else if (leadData.contactDetails?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.contactDetails.email.trim())) {
      errors.push('Please enter a valid contact email address.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
