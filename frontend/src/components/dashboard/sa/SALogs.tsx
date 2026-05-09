'use client';
import React, { useState, useEffect } from 'react';
import { FileText, RefreshCcw, Search, Clock, Shield, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SALogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try { setLogs(await api.superAdmin.getLogs()); }
    catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action?.includes('Created')) return 'bg-green-50 text-green-600';
    if (action?.includes('Suspended') || action?.includes('Deleted')) return 'bg-red-50 text-red-600';
    if (action?.includes('Updated')) return 'bg-blue-50 text-blue-600';
    return 'bg-orange-50 text-[#F26522]';
  };

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#111]">Activity Logs</h1>
          <p className="text-[#6A6F73] mt-1">Audit trail of platform administrative events.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} className="border-[#eee] bg-white">
          <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
        <Input 
          placeholder="Search logs..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-10 bg-white border-[#eee]" 
        />
      </div>

      {/* Logs Table */}
      <Card className="bg-white border-[#eee] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-[#eee]">
                <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Admin</th>
                <th className="px-6 py-4 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-white rounded w-full" /></td>
                  ))}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6A6F73]">No logs found</td></tr>
              ) : filtered.map((log, i) => (
                <tr key={i} className="hover:bg-white transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#6A6F73]" />
                      <div>
                        <p className="text-sm font-medium text-[#111]">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-[#6A6F73]">{new Date(log.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-white border border-[#eee] flex items-center justify-center text-xs font-bold text-[#111]">{log.company_name?.[0]}</div>
                      <span className="text-sm font-medium text-[#111]">{log.company_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={cn("border-none text-[10px] px-2 py-1", getActionColor(log.action))}>
                      {log.action?.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#6A6F73]" />
                      <span className="text-sm text-[#111]">{log.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#F26522] opacity-50" />
                      <span className="text-sm text-[#6A6F73] max-w-xs truncate">{log.details}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
