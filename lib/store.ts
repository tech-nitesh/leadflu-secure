import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lead, User, Role, Plan } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  currentUser: User | null;
  users: User[];
  leads: Lead[];
  spreadsheetId: string | null;
  setCurrentUser: (user: User | null) => void;
  updateUserRolePlan: (userId: string, role: Role, plan: Plan) => void;
  saveLead: (leadId: string) => void;
  unsaveLead: (leadId: string) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<Lead | null>;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  setLeads: (leads: Lead[]) => void;
  fetchLeadsFromApi: () => Promise<void>;
  setSpreadsheetId: (id: string) => void;
}

const DEMO_LEADS: Lead[] = [
  {
    id: 'demo-lead-1',
    title: 'Looking for a skilled editor for 3 YouTube Shorts per week',
    description: 'Need a fast-paced, high-retention editor for our finance channel. Must know how to use motion graphics and captions effectively.',
    budgetNumeric: 300,
    budgetString: '$300/week',
    currency: 'USD',
    platform: 'YouTube',
    category: 'Shorts',
    softwareRequired: ['Premiere', 'After Effects'],
    leadType: 'HOT',
    accessType: 'FREE',
    contactDetails: { email: 'creator@example.com' },
    status: 'Active',
    createdAt: 1720000000000,
  },
  {
    id: 'demo-lead-2',
    title: 'Long-form documentary editor needed',
    description: 'We are shooting a 45-minute documentary on tech startups. Need an experienced storyteller to put together the final cut. Raw footage provided.',
    budgetNumeric: 2500,
    budgetString: '$2,500 total',
    currency: 'USD',
    platform: 'YouTube',
    category: 'Documentary',
    softwareRequired: ['DaVinci Resolve'],
    leadType: 'PRO',
    accessType: 'PRO',
    contactDetails: { email: 'studio@docfilms.com', whatsapp: '+1234567890' },
    status: 'Active',
    createdAt: 1720000000000,
  }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      leads: DEMO_LEADS,
      spreadsheetId: null,
      setCurrentUser: (user) => set((state) => {
        if (!user) return { currentUser: null };
        const isAdminEmail = user.email?.toLowerCase() === 'editingbynitesh@gmail.com';
        const existing = state.users.find(u => u.email === user.email);
        if (existing) {
          const updatedExisting: User = {
            ...existing,
            role: isAdminEmail ? 'Admin' : existing.role,
            plan: isAdminEmail ? 'PRO' : existing.plan,
          };
          return {
            currentUser: updatedExisting,
            users: state.users.map(u => u.id === existing.id ? updatedExisting : u)
          };
        } else {
          // Determine if admin
          const newUser: User = {
            ...user,
            role: isAdminEmail ? 'Admin' : 'Guest',
            plan: isAdminEmail ? 'PRO' : 'FREE',
            savedLeads: [],
            unlockedLeads: [],
          };
          return { currentUser: newUser, users: [...state.users, newUser] };
        }
      }),
      updateUserRolePlan: (userId, role, plan) => set((state) => {
        // Security check: Only Admins can modify other users' roles or upgrade to Admin
        const isOperatorAdmin = state.currentUser?.role === 'Admin' || state.currentUser?.email?.toLowerCase() === 'editingbynitesh@gmail.com';
        if (!isOperatorAdmin && role === 'Admin') {
          console.warn('Unauthorized role change attempt blocked.');
          return state;
        }

        const updatedUsers = state.users.map(u => u.id === userId ? { ...u, role, plan } : u);
        const updatedCurrentUser = state.currentUser?.id === userId 
          ? { ...state.currentUser, role, plan } 
          : state.currentUser;

        return {
          users: updatedUsers,
          currentUser: updatedCurrentUser
        };
      }),
      saveLead: (leadId) => set((state) => {
        if (!state.currentUser) return state;
        const updatedUser = {
          ...state.currentUser,
          savedLeads: Array.from(new Set([...state.currentUser.savedLeads, leadId]))
        };
        return {
          currentUser: updatedUser,
          users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u)
        };
      }),
      unsaveLead: (leadId) => set((state) => {
        if (!state.currentUser) return state;
        const updatedUser = {
          ...state.currentUser,
          savedLeads: state.currentUser.savedLeads.filter(id => id !== leadId)
        };
        return {
          currentUser: updatedUser,
          users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u)
        };
      }),
      fetchLeadsFromApi: async () => {
        try {
          const { currentUser } = get();
          const res = await fetch('/api/leads', {
            headers: {
              'x-user-email': currentUser?.email || '',
              'x-user-role': currentUser?.role || '',
              'x-user-plan': currentUser?.plan || '',
            },
            cache: 'no-store'
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
            set({ leads: data.leads });
          }
        } catch {
          // Ignore if API endpoint doesn't exist
        }
      },
      addLead: async (lead) => {
        try {
          const { currentUser } = get();
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': currentUser?.email || '',
              'x-user-role': currentUser?.role || '',
              'x-user-plan': currentUser?.plan || '',
            },
            body: JSON.stringify(lead),
          });
          if (!res.ok) throw new Error('API route unavailable');
          const data = await res.json();
          if (data.success && data.lead) {
            set((state) => ({ leads: [data.lead, ...state.leads] }));
            return data.lead;
          } else {
            throw new Error(data.errors?.join(', ') || 'Failed to add lead via server API');
          }
        } catch {
          const cleanedTitle = (lead.title || 'Untitled Opportunity').trim();
          const cleanedDesc = (lead.description || 'No description provided.').trim();
          const newLead: Lead = {
            ...lead,
            title: cleanedTitle,
            description: cleanedDesc,
            budgetNumeric: Number(lead.budgetNumeric) || 0,
            budgetString: lead.budgetString || `$${Number(lead.budgetNumeric) || 0}`,
            currency: lead.currency || 'USD',
            platform: lead.platform || 'YouTube',
            category: lead.category || 'Shorts',
            softwareRequired: Array.isArray(lead.softwareRequired) ? lead.softwareRequired : ['Premiere'],
            leadType: lead.leadType || 'HOT',
            accessType: lead.accessType || 'FREE',
            contactDetails: {
              email: lead.contactDetails?.email?.trim() || 'contact@example.com',
              whatsapp: lead.contactDetails?.whatsapp?.trim() || undefined,
            },
            status: lead.status || 'Active',
            id: uuidv4(),
            createdAt: Date.now(),
          };
          set((state) => ({ leads: [newLead, ...state.leads] }));
          return newLead;
        }
      },
      updateLead: (id, updates) => set((state) => ({
        leads: state.leads.map(l => {
          if (l.id !== id) return l;
          return {
            ...l,
            ...updates,
            title: updates.title !== undefined ? updates.title.trim() : l.title,
            description: updates.description !== undefined ? updates.description.trim() : l.description,
            contactDetails: updates.contactDetails ? {
              email: updates.contactDetails.email?.trim() || l.contactDetails.email,
              whatsapp: updates.contactDetails.whatsapp !== undefined ? updates.contactDetails.whatsapp.trim() : l.contactDetails.whatsapp,
            } : l.contactDetails,
          };
        })
      })),
      deleteLead: (id) => set((state) => ({
        leads: state.leads.filter(l => l.id !== id)
      })),
      setLeads: (leads) => set({ leads }),
      setSpreadsheetId: (id) => set({ spreadsheetId: id }),
    }),
    {
      name: 'lead-manager-storage',
      skipHydration: true,
    }
  )
);
