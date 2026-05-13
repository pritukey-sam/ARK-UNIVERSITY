'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Activity, CreditCard, Clock, Users, PlayCircle, 
  CheckCircle2, DollarSign, RefreshCw, Building2, BarChart3,
  ListTodo, ShieldCheck, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart as RBarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SADashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [s, c, g, l] = await Promise.all([
        api.superAdmin.getStats(), 
        api.superAdmin.getCompanies(), 
        api.superAdmin.getGrowth(),
        api.superAdmin.getLogs()
      ]);
      setStats(s);
      setCompanies(c);
      setGrowthData(g);
      setLogs(l);
    } catch (e) {
      toast.error('Failed to fetch platform statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Recently' : date.toLocaleString();
  };

  const kpis = [
    { label: 'Total Revenue', value: `₹${stats?.total_revenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-[#F26522]', bg: 'bg-orange-50' },
    { label: 'Paid Companies', value: stats?.paid_companies || 0, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Revenue/Org', value: `₹${stats?.avg_revenue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#111]">Platform Control Center</h1>
          <p className="text-[#6A6F73] mt-1">Real-time oversight of all organizations and system health.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="border-[#eee]" onClick={fetchData}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
          </Button>
          <Button onClick={() => router.push('/super-admin/companies')} className="bg-[#F26522] hover:bg-[#D54D10] text-white font-bold">
            <Building2 className="w-4 h-4 mr-2" /> Manage Companies
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpis.map((k, i) => (
          <Card key={i} className="p-6 bg-white border border-[#eee] shadow-sm">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg", k.bg, k.color)}>
                <k.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#6A6F73]">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Revenue Chart */}
          <Card className="p-6 bg-white border border-[#eee] shadow-sm">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Revenue Growth (MRR)</CardTitle>
              <TrendingUp className="w-5 h-5 text-[#F26522]" />
            </CardHeader>
            <div className="h-80 w-full min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F26522" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#F26522" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#F26522" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Companies Table */}
          <Card className="bg-white border border-[#eee] shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-[#eee]">
              <CardTitle className="text-lg">Recent Organizations</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-[#eee]">
                    <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase">Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase">Plan</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee]">
                  {companies.slice(0, 5).map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-[#111]">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-[#111] uppercase font-medium">{c.plan_type}</td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          c.status === 'active' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                        )}>
                          {c.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6A6F73] font-medium">{c.employee_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Activity Log */}
        <div className="space-y-8">
          <Card className="p-6 bg-white border border-[#eee] shadow-sm">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">System Audit Log</CardTitle>
              <ShieldCheck className="w-5 h-5 text-[#F26522]" />
            </CardHeader>
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-[#eee] rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="mt-1">
                    {log.action.includes('Approved') ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                     log.action.includes('Rejected') ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                     <Activity className="w-4 h-4 text-[#F26522]" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111]">{log.action}</p>
                    <p className="text-xs text-[#6A6F73] mt-0.5">{log.details}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-[#6A6F73] font-bold uppercase">{log.company_name}</span>
                      <span className="text-[10px] text-[#6A6F73]">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-[#6A6F73] text-sm">No recent logs</div>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-[#6A6F73] hover:text-[#F26522] text-sm font-bold">
              View Complete Logs
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
