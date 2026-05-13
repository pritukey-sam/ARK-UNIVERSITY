'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Building2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SAAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    Promise.all([api.superAdmin.getStats(), api.superAdmin.getGrowth()])
      .then(([s, g]) => { setStats(s); setGrowthData(g); })
      .catch(() => toast.error('Failed to load analytics'));
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111]">Platform Analytics</h1>
        <p className="text-[#6A6F73] mt-1">Global performance metrics and growth trends.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats?.total_revenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-[#F26522]', bg: 'bg-orange-100' },
          { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Avg Revenue/Org', value: `₹${stats?.avg_revenue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Total Courses', value: stats?.total_courses || 0, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map((s, i) => (
          <Card key={i} className="p-6 bg-white border border-[#eee]">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg", s.bg, s.color)}><s.icon className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-[#6A6F73]">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="p-6 bg-white border border-[#eee]">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-lg">Revenue Growth</CardTitle>
          <p className="text-sm text-[#6A6F73]">Monthly recurring revenue trend</p>
        </CardHeader>
        <div className="h-80 w-full min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F26522" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#F26522" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `₹${v}`} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#F26522" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* User + Company Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 bg-white border border-[#eee]">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-lg">User Growth</CardTitle>
          </CardHeader>
          <div className="h-80 w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-[#eee]">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-lg">Company Growth</CardTitle>
          </CardHeader>
          <div className="h-80 w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="companies" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
