'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { 
  History, Search, Loader2, Calendar, User, 
  Shield, Activity, FileText, CheckCircle2, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.get('/audit-logs');
      setLogs(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const term = search.toLowerCase();
    return logs.filter(l => 
      (l.actor_name && l.actor_name.toLowerCase().includes(term)) ||
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.target && l.target.toLowerCase().includes(term)) ||
      (l.details && l.details.toLowerCase().includes(term))
    );
  }, [logs, search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const adminActions = logs.filter(l => 
      l.actor_role === 'admin'
    ).length;
    const hrActions = logs.filter(l => l.actor_role === 'hr').length;
    const employeeActions = logs.filter(l => 
      l.actor_role !== 'admin' && l.actor_role !== 'hr'
    ).length;

    return { total, adminActions, hrActions, employeeActions };
  }, [logs]);

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F26522] flex items-center justify-center border border-orange-100 shrink-0">
              <History className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Audit Trail Log</h1>
              <p className="text-gray-500 font-medium mt-0.5">Chronological record of corporate events and system modifications.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center w-full md:w-auto">
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold h-11 px-5 rounded-xl transition-all"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by actor name, action, target or details..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-10 border-gray-200 bg-gray-50/50 h-11 focus:bg-white focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl transition-all font-medium"
            />
          </div>
          {search && (
            <Button 
              variant="ghost" 
              onClick={() => setSearch('')}
              className="h-11 text-gray-500 hover:text-[#F26522] hover:bg-orange-50 font-bold text-xs rounded-xl px-4 w-full lg:w-auto shrink-0"
            >
              Clear Search
            </Button>
          )}
        </div>
      </div>



      {/* Main Logs Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-48">Timestamp</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-48">Actor</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center w-28">Role</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-40">Action</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-52">Target</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-16 mx-auto" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-48" /></td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.slice(0, showAllLogs ? undefined : 15).map((l) => {
                  const role = (l.actor_role || '').toLowerCase();
                  
                  // Premium badge color styling per instructions
                  let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
                  if (role === 'admin') {
                    badgeClass = "bg-red-50 text-red-700 border-red-200/60";
                  } else if (role === 'hr') {
                    badgeClass = "bg-blue-50 text-blue-700 border-blue-200/60";
                  } else if (role === 'employee') {
                    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                  }

                  return (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{l.timestamp}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-bold text-gray-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-black shrink-0 border border-gray-200 uppercase leading-none">
                            {l.actor_name?.[0] || 'S'}
                          </div>
                          <span className="truncate">{l.actor_name || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0", badgeClass)}>
                          {role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-black text-gray-900 whitespace-nowrap">
                        {l.action}
                      </td>
                      <td className="px-6 py-4.5 text-xs font-extrabold text-orange-600 tracking-wider uppercase shrink-0 max-w-[200px] truncate">
                        {l.target !== 'N/A' ? l.target : <span className="text-gray-300 font-medium lowercase italic">none</span>}
                      </td>
                      <td className="px-6 py-4.5 text-sm font-medium text-gray-600 max-w-sm truncate" title={l.details}>
                        {l.details}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    No activity logs registered in this domain
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredLogs.length > 15 && (
          <div className="flex justify-center py-5 border-t border-gray-50 bg-gray-50/20">
            <Button
              variant="outline"
              onClick={() => setShowAllLogs(!showAllLogs)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold h-11 px-6 rounded-xl transition-all shadow-sm active:scale-95"
            >
              {showAllLogs ? "Collapse Trail" : `Load More (${filteredLogs.length - 15} entries)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
