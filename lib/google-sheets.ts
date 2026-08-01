import { Lead } from './types';
import { v4 as uuidv4 } from 'uuid';

export async function createSpreadsheet(accessToken: string, title: string): Promise<string> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Leads' } }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create spreadsheet');
  return data.spreadsheetId;
}

const HEADER_ROW = ['ID', 'Title', 'Description', 'Budget Numeric', 'Budget String', 'Currency', 'Platform', 'Category', 'Software Required', 'Lead Type', 'Access Type', 'Email', 'WhatsApp', 'Social Links', 'Status', 'Created At'];

function leadToRow(lead: Lead): string[] {
  return [
    lead.id,
    lead.title,
    lead.description,
    lead.budgetNumeric.toString(),
    lead.budgetString,
    lead.currency,
    lead.platform,
    lead.category,
    lead.softwareRequired.join(', '),
    lead.leadType,
    lead.accessType,
    lead.contactDetails.email,
    lead.contactDetails.whatsapp || '',
    lead.contactDetails.socialLinks?.join(', ') || '',
    lead.status,
    new Date(lead.createdAt).toISOString()
  ];
}

function rowToLead(row: string[]): Lead {
  return {
    id: row[0] || uuidv4(),
    title: row[1] || '',
    description: row[2] || '',
    budgetNumeric: parseFloat(row[3]) || 0,
    budgetString: row[4] || '',
    currency: row[5] || 'USD',
    platform: (row[6] as any) || 'Other',
    category: (row[7] as any) || 'Other',
    softwareRequired: row[8] ? row[8].split(',').map(s => s.trim()) : [],
    leadType: (row[9] as any) || 'FREE',
    accessType: (row[10] as any) || 'FREE',
    contactDetails: {
      email: row[11] || '',
      whatsapp: row[12] || undefined,
      socialLinks: row[13] ? row[13].split(',').map(s => s.trim()) : undefined,
    },
    status: (row[14] as any) || 'Active',
    createdAt: row[15] ? new Date(row[15]).getTime() : Date.now(),
  };
}

export async function pushLeadsToSheet(accessToken: string, spreadsheetId: string, leads: Lead[]) {
  const values = [HEADER_ROW, ...leads.map(leadToRow)];

  // Clear existing
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:Z:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Write new
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:Z?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to push leads to sheet');
  }
}

export async function pullLeadsFromSheet(accessToken: string, spreadsheetId: string): Promise<Lead[]> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:Z`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to pull leads from sheet');

  const rows: string[][] = data.values || [];
  if (rows.length <= 1) return []; // Only header or empty

  // Skip header
  return rows.slice(1).map(rowToLead);
}
