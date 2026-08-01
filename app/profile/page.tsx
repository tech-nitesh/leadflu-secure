"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { signInWithGoogle, logout, getAuthErrorMessage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LeadFluLogo } from '@/components/logo';
import { UserCircle2, LogOut, Shield, Crown, Zap } from 'lucide-react';

export default function Profile() {
  const { currentUser, setCurrentUser, leads } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [redirectNotice, setRedirectNotice] = useState(false);
  const [upgradeNote, setUpgradeNote] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    setRedirectNotice(false);
    try {
      const result = await signInWithGoogle();
      if (result.usedRedirect) {
        setRedirectNotice(true);
        return;
      }
      setCurrentUser({
        id: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        avatar: result.user.photoURL,
        role: 'Guest',
        plan: 'FREE',
        savedLeads: [],
        unlockedLeads: []
      });
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError(getAuthErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <main className="flex flex-col min-h-screen pb-24 items-center justify-center p-6 bg-transparent">
        <div className="text-center mb-8 flex flex-col items-center">
          <LeadFluLogo variant="app-icon" size="xl" className="mb-6" />
          <LeadFluLogo variant="full" size="lg" className="mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm mt-1">
            Sign in to access verified video editor gigs
          </p>
        </div>
        <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full max-w-xs gap-3 rounded-full py-6 shadow-lg shadow-black/5 bg-white dark:bg-white/10 dark:hover:bg-white/20 text-zinc-900 dark:text-white border border-black/5 dark:border-white/10 hover:bg-zinc-50" size="lg" variant="outline">
          <svg viewBox="0 0 48 48" className="w-5 h-5 bg-white rounded-full p-0.5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        </Button>
        {redirectNotice && (
          <p className="text-blue-600 dark:text-blue-400 text-sm mt-4 text-center max-w-xs">
            You will be redirected to Google to complete sign-in. After signing in you will be brought back automatically.
          </p>
        )}
        {loginError && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-4 text-center max-w-xs">{loginError}</p>
        )}
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen pb-24 p-6 bg-transparent">
      <div className="flex items-center justify-between mb-8">
        <LeadFluLogo variant="full" size="sm" />
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Account</span>
      </div>
      
      <div className="flex flex-col items-center mb-10">
        <div className="w-28 h-28 rounded-full bg-white/50 dark:bg-white/5 flex items-center justify-center overflow-hidden mb-4 border-[6px] border-white/80 dark:border-white/10 shadow-2xl shadow-black/5">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="w-14 h-14 text-zinc-400" />
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{currentUser.name}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">{currentUser.email}</p>
        <div className="flex gap-2">
          {currentUser.role === 'Admin' && <Badge variant="default" className="gap-1 bg-black dark:bg-white text-white dark:text-black shadow-lg rounded-full px-4"><Shield className="w-3.5 h-3.5" /> Admin</Badge>}
          {currentUser.plan === 'PRO' && <Badge variant="default" className="gap-1 bg-blue-600 text-white hover:bg-blue-700 border-none shadow-lg shadow-blue-500/30 rounded-full px-4"><Crown className="w-3.5 h-3.5" /> PRO</Badge>}
          {currentUser.plan === 'FREE' && <Badge variant="secondary" className="gap-1 text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-white/10 border-white/40 dark:border-white/5 rounded-full px-4 backdrop-blur-md">Free Plan</Badge>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 shadow-lg shadow-black/5 flex justify-between items-center">
          <div>
            <p className="font-bold text-lg">Saved Leads</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{currentUser.savedLeads.length} leads bookmarked</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full bg-white dark:bg-white/10 border-black/5 dark:border-white/10 shadow-sm" asChild>
            <a href="/saved">View All</a>
          </Button>
        </div>

        {currentUser.plan === 'FREE' && (
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-blue-500/20 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
            <h3 className="font-bold text-xl flex items-center gap-2 mb-2 relative z-10">
              <Crown className="w-5 h-5 text-blue-200" /> Upgrade to Pro
            </h3>
            <p className="text-blue-100/80 mb-6 text-sm relative z-10">
              Unlock full contact details and get priority access to premium editing gigs.
            </p>
            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 rounded-full font-bold shadow-lg shadow-black/10 relative z-10" onClick={() => setUpgradeNote(true)}>
              Upgrade Now
            </Button>
            {upgradeNote && (
              <p className="text-blue-100/90 text-xs text-center relative z-10 mt-3">
                Pro upgrades are coming soon. Contact the admin to enable your PRO plan.
              </p>
            )}
          </div>
        )}

        <Button variant="outline" className="w-full gap-2 rounded-full py-6 mt-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </main>
  );
}
