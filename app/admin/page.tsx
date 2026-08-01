"use client";
import React from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { LeadFluLogo } from '@/components/logo';
import { Users, FileText, TrendingUp, Zap } from 'lucide-react';

export default function AdminOverview() {
  const { users, leads } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users },
    { label: 'Pro Users', value: users.filter(u => u.plan === 'PRO').length, icon: Zap },
    { label: 'Active Leads', value: leads.filter(l => l.status === 'Active').length, icon: FileText },
    { label: 'Total Leads', value: leads.length, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <LeadFluLogo variant="full" size="md" className="mb-1" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Admin Dashboard Overview</p>
        </div>
        <LeadFluLogo variant="app-icon" size="sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                  <Icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
