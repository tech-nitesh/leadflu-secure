"use client";
import { useEffect } from 'react';
import {
  completeRedirectSignIn,
  getFirebaseIdToken,
  onAuthChange,
  setCachedAccessToken,
} from '@/lib/firebase';
import { useStore } from '@/lib/store';
import { User as AppUser } from '@/lib/types';

function toAppUser(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): AppUser {
  const username = user.email?.toLowerCase().replace(/@leadflu\.app$/, '') || null;
  return {
    id: user.uid,
    name: user.displayName || username,
    username,
    email: user.email,
    avatar: user.photoURL,
    role: 'Guest',
    plan: 'FREE',
    savedLeads: [],
    unlockedLeads: [],
  };
}

async function syncServerProfile() {
  const token = await getFirebaseIdToken();
  if (!token) return;
  try {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.success && data?.user?.role) {
      const store = useStore.getState();
      const current = store.currentUser;
      if (current && current.id === data.user.uid) {
        store.applyServerProfile(data.user.uid, data.user.role, data.user.plan, data.user.username, data.user.name);
      }
    }
  } catch {
    // Server profile sync is best-effort
  }
}

export function AuthProvider() {
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await useStore.persist.rehydrate();

      const redirectResult = await completeRedirectSignIn();
      if (!mounted) return;
      if (redirectResult?.user) {
        setCachedAccessToken(redirectResult.accessToken || null);
        setCurrentUser(toAppUser(redirectResult.user));
      }

      const unsubscribe = onAuthChange((user) => {
        if (!mounted) return;
        if (user) {
          const current = useStore.getState().currentUser;
          if (!current || current.id !== user.uid) {
            setCurrentUser(toAppUser(user));
            // The cached lead list is per-viewer (contacts are masked by who you
            // are). Clear it on a user change and re-fetch with the new identity
            // so one person's view never leaks to another.
            useStore.setState({ leads: [], leadsLoadedAt: null });
            syncServerProfile().then(() => useStore.getState().fetchLeadsFromApi(true));
          }
        } else {
          setCachedAccessToken(null);
          if (useStore.getState().currentUser) {
            setCurrentUser(null);
            useStore.setState({ leads: [], leadsLoadedAt: null });
          }
        }
      });
    };

    init();

    return () => {
      mounted = false;
    };
  }, [setCurrentUser]);

  return null;
}
