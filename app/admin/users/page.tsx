"use client";
import React from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Shield, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminUsersPage() {
  const { users, updateUserRolePlan } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
        <p className="text-zinc-500">Manage user roles and subscription plans.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold">{user.name}</h4>
                    <p className="text-sm text-zinc-500">{user.email}</p>
                    <div className="flex gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{user.role}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">{user.plan}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {user.plan !== 'PRO' ? (
                    <Button variant="secondary" size="sm" onClick={() => updateUserRolePlan(user.id, user.role, 'PRO')} className="gap-2">
                      <Crown className="w-4 h-4 text-amber-500" /> Upgrade to Pro
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => updateUserRolePlan(user.id, user.role, 'FREE')}>
                      Revoke Pro
                    </Button>
                  )}
                  
                  {user.role !== 'Admin' && (
                    <Button variant="outline" size="sm" onClick={() => updateUserRolePlan(user.id, 'Admin', user.plan)}>
                      Make Admin
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-zinc-500 text-sm">No users registered yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
