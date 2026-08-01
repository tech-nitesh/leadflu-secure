"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadFluLogo } from '@/components/logo';
import { Users, FileText, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { getFirebaseIdToken } from '@/lib/firebase';
import { format } from 'date-fns';

interface AdminUserRow {
  id: string;
  username: string;
  name: string | null;
  role: string;
  plan: string;
  createdAt: number;
}

export default function AdminOverview() {
  const { leads } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [userList, setUserList] = React.useState<AdminUserRow[]>([]);

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;
    (async () => {
      const token = await getFirebaseIdToken();
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        setUserList(data.users || []);
      } catch {
        // Stats are best-effort
      }
    })();
  }, [isMounted]);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const totalUsers = userList.length;
  const proUsers = userList.filter((u) => u.plan === 'PRO').length;
  const activeLeads = leads.filter((l) => l.status === 'Active').length;

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, href: '/admin/users' },
    { label: 'Pro Users', value: proUsers, icon: Zap, href: '/admin/users' },
    { label: 'Active Leads', value: activeLeads, icon: FileText, href: '/admin/leads' },
    { label: 'Total Leads', value: leads.length, icon: TrendingUp, href: '/admin/leads' },
  ];

  const recentLeads = [...leads]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 6);

  const latestUsers = [...userList]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 6);

  const safeFormat = (val: any) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? '' : format(d, 'MMM d');
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Admin Dashboard</p>
        </div>
        <LeadFluLogo variant="app-icon" size="sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link key={i} href={stat.href}>
              <Card className="hover:shadow-lg hover:border-blue-500/40 transition-all cursor-pointer h-full">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-blue-500 flex items-center gap-0.5">
                      View <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Leads</CardTitle>
            <Link href="/admin/leads" className="text-sm text-blue-500 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-zinc-500">No leads yet. Create your first lead in the Lead Manager.</p>
            ) : (
              recentLeads.map((lead) => (
                <Link key={lead.id} href="/admin/leads" className="block">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lead.title}</p>
                      <p className="text-xs text-zinc-500">
                        {lead.platform} • {lead.budgetString}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {lead.status === 'Active' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">Active</span>
                      ) : (
                        lead.status
                      )}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Latest Users</CardTitle>
            <Link href="/admin/users" className="text-sm text-blue-500 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestUsers.length === 0 ? (
              <p className="text-sm text-zinc-500">No users yet.</p>
            ) : (
              latestUsers.map((user) => (
                <Link key={user.id} href="/admin/users" className="block">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.name || user.username} <span className="text-zinc-400 font-normal">@{user.username}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {user.role} • Joined {safeFormat(user.createdAt) || 'recently'}
                      </p>
                    </div>
                    <span className="text-xs shrink-0">
                      {user.plan === 'PRO' ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">PRO</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500">FREE</span>
                      )}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
