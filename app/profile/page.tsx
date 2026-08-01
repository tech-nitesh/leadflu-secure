"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { loginWithUsername, logout, getAuthErrorMessage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LeadFluLogo } from '@/components/logo';
import { whatsappLink } from '@/lib/whatsapp';
import { UserCircle2, LogOut, Shield, Crown, LifeBuoy } from 'lucide-react';

export default function Profile() {
  const { currentUser, setCurrentUser } = useStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [upgradeNote, setUpgradeNote] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const user = await loginWithUsername(username, password);
      setCurrentUser({
        id: user.uid,
        name: user.displayName || user.email?.toLowerCase().replace(/@leadflu\.app$/, '') || null,
        username: user.email?.toLowerCase().replace(/@leadflu\.app$/, ''),
        email: user.email,
        avatar: null,
        role: 'Guest',
        plan: 'FREE',
        savedLeads: [],
        unlockedLeads: []
      });
      router.push('/');
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError(getAuthErrorMessage(err, { usernameLogin: true }));
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
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
          <Input
            type="text"
            placeholder="Username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-12 rounded-full px-5 bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10 backdrop-blur-md"
          />
          <Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-full px-5 bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10 backdrop-blur-md"
          />
          <Button type="submit" disabled={isLoggingIn} className="w-full rounded-full py-6 shadow-lg shadow-black/5" size="lg">
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </Button>
          {loginError && (
            <div className="text-center mt-4 space-y-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{loginError}</p>
              {(() => {
                const wa = whatsappLink('Hi Nitesh, I am having trouble logging in my account.');
                return wa ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full gap-2 bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10">
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      <LifeBuoy className="w-4 h-4" /> Contact Support
                    </a>
                  </Button>
                ) : null;
              })()}
            </div>
          )}
        </form>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-6 text-center max-w-xs">
          No account? Contact the admin to create one. You can browse free leads without signing in.
        </p>
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
        <h2 className="text-2xl font-bold tracking-tight">{currentUser.name || currentUser.username}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">@{currentUser.username || 'user'}</p>
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
            {(() => {
              const wa = whatsappLink('Hi Nitesh, I want the PRO membership for LeadFlu.');
              return wa ? (
                <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50 rounded-full font-bold shadow-lg shadow-black/10 relative z-10">
                  <a href={wa} target="_blank" rel="noopener noreferrer">Upgrade Now</a>
                </Button>
              ) : (
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 rounded-full font-bold shadow-lg shadow-black/10 relative z-10" onClick={() => setUpgradeNote(true)}>
                  Upgrade Now
                </Button>
              );
            })()}
            {upgradeNote && (
              <p className="text-blue-100/90 text-xs text-center relative z-10 mt-3">
                Pro upgrades are coming soon. Contact the admin to enable your PRO plan.
              </p>
            )}
          </div>
        )}

        {currentUser.role === 'Admin' && (
          <Button variant="outline" className="w-full gap-2 rounded-full py-6 bg-white/40 dark:bg-white/5 backdrop-blur-md border-white/40 dark:border-white/10 shadow-sm" asChild>
            <a href="/admin"><Shield className="w-4 h-4" /> Open Admin Panel</a>
          </Button>
        )}

        <Button variant="outline" className="w-full gap-2 rounded-full py-6 mt-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </main>
  );
}
