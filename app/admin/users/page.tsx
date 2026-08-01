"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Shield, User, UserPlus, Loader2, Trash2, RefreshCw, Eye, EyeOff, Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getFirebaseIdToken } from '@/lib/firebase';

interface AdminUser {
  id: string;
  username: string;
  name: string | null;
  role: 'Admin' | 'Guest';
  plan: 'FREE' | 'PRO';
  expiryDate: number | null;
  createdAt: number;
  expired?: boolean;
}

export default function AdminUsersPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'PRO' | 'FREE'>('FREE');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const loadUsers = async () => {
    const token = await getFirebaseIdToken();
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to load users.');
        return;
      }
      const data = await res.json();
      const now = Date.now();
      setUsers((data.users || []).map((u: AdminUser) => ({
        ...u,
        expired: u.plan === 'PRO' && !!u.expiryDate && u.expiryDate < now,
      })));
      setError(null);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount for SSR-safe admin data
    loadUsers();
  }, [isMounted]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!/^[a-z0-9_.-]{3,}$/.test(username.trim().toLowerCase())) {
      setFormError('Username must be 3+ characters (letters, numbers, . _ -).');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setCreating(true);
    const token = await getFirebaseIdToken();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password, name, plan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(data?.error || 'Failed to create user.');
        return;
      }
      setUsers((prev) => [data.user, ...prev]);
      setUsername('');
      setPassword('');
      setName('');
    } catch {
      setFormError('Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const callApi = async (id: string, method: string, body: any) => {
    const token = await getFirebaseIdToken();
    const res = await fetch(`/api/admin/users/${id}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || 'Request failed.');
      return null;
    }
    return data;
  };

  const updatePlan = async (user: AdminUser, nextPlan: 'PRO' | 'FREE') => {
    setUpdatingId(user.id);
    try {
      const data = await callApi(user.id, 'PUT', { plan: nextPlan });
      if (data?.user) setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
    } finally {
      setUpdatingId(null);
    }
  };

  const renewPro = async (user: AdminUser) => {
    setUpdatingId(user.id);
    try {
      const data = await callApi(user.id, 'PUT', { renew: true });
      if (data?.user) setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
    } finally {
      setUpdatingId(null);
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete account "${user.username}"? This cannot be undone.`)) return;
    setUpdatingId(user.id);
    try {
      const data = await callApi(user.id, 'DELETE', {});
      if (data?.success) setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter(u => !q || `${u.username} ${u.name || ''}`.toLowerCase().includes(q));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
        <p className="text-zinc-500">Create accounts (username + password), manage plans, renewals and expiry.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Create New Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                <Input placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Username</label>
                <Input placeholder="e.g. rahul" required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Plan</label>
                <div className="flex gap-2">
                  <Button type="button" variant={plan === 'FREE' ? 'default' : 'outline'} size="sm" onClick={() => setPlan('FREE')} className="rounded-full">Free</Button>
                  <Button type="button" variant={plan === 'PRO' ? 'default' : 'outline'} size="sm" onClick={() => setPlan('PRO')} className="rounded-full">PRO</Button>
                </div>
              </div>
            </div>
            {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}
            <Button type="submit" disabled={creating} className="rounded-full">
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading users...</p>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-full bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              {filteredUsers.map((user) => {
                const isAdminRow = user.role === 'Admin';
                return (
                  <div key={user.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-4 flex-wrap min-w-0">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {isAdminRow ? <Shield className="w-6 h-6 text-zinc-500" /> : <User className="w-6 h-6 text-zinc-500" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{user.name || user.username}</h4>
                        <p className="text-sm text-zinc-500">@{user.username}</p>
                        <div className="flex gap-2 mt-1.5 items-center flex-wrap">
                          {isAdminRow && <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Admin</Badge>}
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">{user.plan}</Badge>
                          {user.plan === 'PRO' && user.expiryDate && (
                            <span className={`text-[10px] ${user.expired ? 'text-rose-500' : 'text-zinc-400'}`}>
                              expires {format(user.expiryDate, 'd MMM yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isAdminRow ? (
                      <div className="flex flex-wrap gap-2">
                        {user.plan !== 'PRO' ? (
                          <Button variant="secondary" size="sm" disabled={updatingId === user.id} onClick={() => updatePlan(user, 'PRO')} className="gap-2">
                            <Crown className="w-4 h-4 text-amber-500" /> Upgrade to Pro
                          </Button>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" disabled={updatingId === user.id} onClick={() => renewPro(user)} className="gap-2">
                              <RefreshCw className="w-4 h-4" /> Renew +30 days
                            </Button>
                            <Button variant="outline" size="sm" disabled={updatingId === user.id} onClick={() => updatePlan(user, 'FREE')}>
                              Downgrade
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" disabled={updatingId === user.id} onClick={() => removeUser(user)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 gap-1">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider self-start md:self-auto">Fixed account</Badge>
                    )}
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-zinc-500 text-sm">{q ? 'No users match your search.' : 'No users registered yet.'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
