import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lead, User, Role, Plan } from './types';
import { getFirebaseIdToken } from './firebase';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  currentUser: User | null;
  users: User[];
  leads: Lead[];
  spreadsheetId: string | null;
  setCurrentUser: (user: User | null) => void;
  applyServerProfile: (uid: string, role: Role, plan: Plan) => void;
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      leads: [],
      spreadsheetId: null,
      setCurrentUser: (user) => set((state) => {
        if (!user) return { currentUser: null };
        const existing = state.users.find(u => u.email === user.email);
        if (existing) {
          return {
            currentUser: existing,
            users: state.users.map(u => u.id === existing.id ? existing : u)
          };
        } else {
          const newUser: User = {
            ...user,
            role: 'Guest',
            plan: 'FREE',
            savedLeads: [],
            unlockedLeads: [],
          };
          return { currentUser: newUser, users: [...state.users, newUser] };
        }
      }),
      applyServerProfile: (uid, role, plan) => set((state) => {
        const current = state.currentUser;
        if (!current || current.id !== uid) return state;
        const updated: User = { ...current, role, plan };
        return {
          currentUser: updated,
          users: state.users.map(u => u.id === uid ? updated : u),
        };
      }),
      updateUserRolePlan: (userId, role, plan) => set((state) => {
        // Security check: Only Admins can modify other users' roles or upgrade to Admin
        if (state.currentUser?.role !== 'Admin' && role === 'Admin') {
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
          const token = await getFirebaseIdToken();
          const res = await fetch('/api/leads', {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            cache: 'no-store'
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && Array.isArray(data.leads)) {
            set({ leads: data.leads });
          }
        } catch {
          // Ignore if API endpoint is unavailable
        }
      },
      addLead: async (lead) => {
        const token = await getFirebaseIdToken();
        if (token) {
          try {
            const res = await fetch('/api/leads', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(lead),
            });
            if (res.status === 401 || res.status === 403) {
              throw new Error('You do not have permission to create leads.');
            }
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.lead) {
                set((state) => ({ leads: [data.lead, ...state.leads] }));
                return data.lead;
              }
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('permission')) throw error;
          }
        }
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
