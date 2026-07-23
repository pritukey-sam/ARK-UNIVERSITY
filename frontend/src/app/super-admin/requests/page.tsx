'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
 CreditCard, CheckCircle2, XCircle, Clock, 
 Search, Mail, Building2, User, ArrowRight,
 Filter, MoreHorizontal, Check, X, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { validateNumericRange } from '@/lib/validation';

function Guard({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 const router = useRouter();
 useEffect(() => {
 if (!loading && (!user || user.role !== 'super_admin')) router.replace('/login');
 }, [user, loading, router]);
 if (loading || !user || user.role !== 'super_admin') {
 return <div className="min-h-screen bg-[#080810] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7C3AED]" /></div>;
 }
 return <>{children}</>;
}

interface RegistrationRequest {
 id: number;
 name: string;
 plan_type: string;
 status: string;
 created_at: string;
 admin_name: string;
 admin_email: string;
}

export default function PurchaseRequestsPage() {
 return (
 <Guard>
 <PurchaseRequestsContent />
 </Guard>
 );
}

function PurchaseRequestsContent() {
 const [requests, setRequests] = useState<RegistrationRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [processingId, setProcessingId] = useState<number | null>(null);
 const [overrides, setOverrides] = useState<Record<number, { plan_type: string, plan_price: number }>>({});
 const [priceErrors, setPriceErrors] = useState<Record<number, string>>({});

 useEffect(() => {
 fetchRequests();
 }, []);

 const fetchRequests = async () => {
 try {
 setLoading(true);
 const data = await api.superAdmin.getRegistrationRequests();
 setRequests(data);
 // Initialize overrides & errors
 const initialOverrides: any = {};
 const initialErrors: any = {};
 data.forEach((r: any) => {
 initialOverrides[r.id] = { plan_type: r.plan_type, plan_price: 0 };
 initialErrors[r.id] = '';
 });
 setOverrides(initialOverrides);
 setPriceErrors(initialErrors);
 } catch (error) {
 toast.error('Failed to fetch registration requests');
 } finally {
 setLoading(false);
 }
 };

 const updateOverride = (id: number, field: string, value: any) => {
 setOverrides(prev => ({
 ...prev,
 [id]: {
 ...prev[id],
 [field]: value
 }
 }));
 };

 const handlePlanTypeOverrideChange = (id: number, type: string) => {
  updateOverride(id, 'plan_type', type);
  if (type === 'free') {
    updateOverride(id, 'plan_price', 0);
    setPriceErrors(prev => ({ ...prev, [id]: '' }));
  }
};

const handlePriceOverrideChange = (id: number, valStr: string) => {
  const parsed = parseFloat(valStr);
  const finalVal = isNaN(parsed) ? 0 : parsed;
  updateOverride(id, 'plan_price', finalVal);
  const check = validateNumericRange(finalVal, 0, 1000000, 'Price');
  setPriceErrors(prev => ({
    ...prev,
    [id]: check.isValid ? '' : (check.error || 'Invalid price')
  }));
};

 const handleAction = async (id: number, action: 'approve' | 'reject') => {
 try {
 setProcessingId(id);
 if (action === 'approve') {
 const override = overrides[id];
 if (override.plan_type === 'paid') {
   const check = validateNumericRange(override.plan_price, 0, 1000000, 'Price');
   if (!check.isValid) {
     setPriceErrors(prev => ({ ...prev, [id]: check.error || 'Invalid price' }));
     return toast.error(check.error || 'Invalid price');
   }
 }
 await api.superAdmin.approveRegistration(id, {
 plan_type: override.plan_type,
 plan_price: override.plan_price
 });
 } else {
 await api.superAdmin.rejectRegistration(id);
 }
 toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
 fetchRequests();
 } catch (error) {
 toast.error('Action failed');
 } finally {
 setProcessingId(null);
 }
 };

 const filteredRequests = requests.filter(r => 
 r.name.toLowerCase().includes(search.toLowerCase()) ||
 r.admin_email.toLowerCase().includes(search.toLowerCase()) ||
 r.admin_name.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <div className="space-y-8 animate-in fade-in duration-500">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
 <CreditCard className="w-8 h-8 text-[#7C3AED]" />
 Purchase Requests
 </h1>
 <p className="text-zinc-500 mt-1 font-medium">Review and manage company registration requests with full plan control.</p>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <StatsCard 
 icon={<Clock className="w-5 h-5 text-amber-500" />}
 label="Pending Approval"
 value={requests.filter(r => r.status === 'pending').length}
 color="amber"
 />
 <StatsCard 
 icon={<XCircle className="w-5 h-5 text-red-500" />}
 label="Rejected"
 value={requests.filter(r => r.status === 'rejected').length}
 color="red"
 />
 <StatsCard 
 icon={<CreditCard className="w-5 h-5 text-purple-500" />}
 label="Total Requests"
 value={requests.length}
 color="purple"
 />
 </div>

 {/* Main Content */}
 <Card className="bg-black/40 border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden">
 <CardHeader className="border-b border-white/5 px-8 py-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
 <Input 
 placeholder="Search requests..." 
 className="bg-white/5 border-white/10 pl-11 rounded-2xl h-11 focus:ring-purple-500/20"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-white/[0.02]">
 <TableRow className="border-white/5 hover:bg-transparent">
 <TableHead className="px-8 py-4 text-xs font-bold uppercase text-zinc-600">Company</TableHead>
 <TableHead className="py-4 text-xs font-bold uppercase text-zinc-600">Admin</TableHead>
 <TableHead className="py-4 text-xs font-bold uppercase text-zinc-600">Requested Plan</TableHead>
 <TableHead className="py-4 text-xs font-bold uppercase text-zinc-600">Final Plan Override</TableHead>
 <TableHead className="py-4 text-xs font-bold uppercase text-zinc-600">Status</TableHead>
 <TableHead className="py-4 text-right pr-8 text-xs font-bold uppercase text-zinc-600">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {loading ? (
 Array.from({ length: 5 }).map((_, i) => (
 <TableRow key={i} className="border-white/5">
 <TableCell className="px-8 py-4"><div className="h-6 w-32 bg-white/5 rounded animate-pulse" /></TableCell>
 <TableCell><div className="h-6 w-24 bg-white/5 rounded animate-pulse" /></TableCell>
 <TableCell><div className="h-6 w-16 bg-white/5 rounded animate-pulse" /></TableCell>
 <TableCell><div className="h-6 w-20 bg-white/5 rounded animate-pulse" /></TableCell>
 <TableCell><div className="h-6 w-24 bg-white/5 rounded animate-pulse" /></TableCell>
 <TableCell className="text-right pr-8"><div className="h-8 w-8 bg-white/5 rounded-full ml-auto animate-pulse" /></TableCell>
 </TableRow>
 ))
 ) : filteredRequests.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="h-64 text-center">
 <div className="flex flex-col items-center justify-center opacity-30">
 <Clock className="w-12 h-12 mb-4" />
 <p className="text-lg font-bold">No requests found</p>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredRequests.map((request) => {
 const override = overrides[request.id] || { plan_type: request.plan_type, plan_price: 0 };
 return (
 <TableRow key={request.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
 <TableCell className="px-8 py-5">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/5 flex items-center justify-center font-bold text-[#7C3AED] shadow-xl">
 {request.name[0].toUpperCase()}
 </div>
 <div className="min-w-0">
 <p className="font-bold text-white group-hover:text-[#7C3AED] transition-colors">{request.name}</p>
 <Badge variant="outline" className="mt-1 bg-white/5 border-white/10 text-xs font-bold uppercase tracking-tighter">ID: #{request.id}</Badge>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <div className="min-w-0">
 <p className="font-bold text-zinc-300">{request.admin_name}</p>
 <p className="text-xs text-zinc-500 mt-0.5">{request.admin_email}</p>
 </div>
 </TableCell>
 <TableCell>
 <Badge className={request.plan_type === 'paid' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}>
 {request.plan_type.toUpperCase()}
 </Badge>
 </TableCell>
 <TableCell>
  {request.status === 'pending' ? (
  <div className="space-y-2 max-w-[150px]">
  <select 
  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
  value={override.plan_type}
  onChange={(e) => handlePlanTypeOverrideChange(request.id, e.target.value)}
  >
  <option value="free" className="bg-zinc-900 text-white">FREE</option>
  <option value="paid" className="bg-zinc-900 text-white">PAID</option>
  </select>
  {override.plan_type === 'paid' && (
  <div className="space-y-1">
    <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">₹</span>
    <Input 
    type="number"
    placeholder="Amount"
    className={cn("h-8 bg-white/5 pl-6 text-xs font-bold", priceErrors[request.id] ? "border-red-500 focus-visible:ring-red-500" : "border-white/10")}
    value={override.plan_price || ''}
    onChange={(e) => handlePriceOverrideChange(request.id, e.target.value)}
    onBlur={(e) => handlePriceOverrideChange(request.id, e.target.value)}
    />
    </div>
    {priceErrors[request.id] && (
      <p className="text-red-500 text-[10px] font-bold">{priceErrors[request.id]}</p>
    )}
  </div>
  )}
  </div>
  ) : (
  <span className="text-xs font-bold text-zinc-500 uppercase">{request.plan_type}</span>
  )}
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <div className={`w-1.5 h-1.5 rounded-full ${request.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
 <span className={`text-xs font-bold ${request.status === 'pending' ? 'text-amber-500' : 'text-red-500'}`}>
 {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
 </span>
 </div>
 </TableCell>
 <TableCell className="text-right pr-8">
 {request.status === 'pending' ? (
 <div className="flex items-center justify-end gap-2">
 <Button 
 size="sm" 
 className="bg-green-600 hover:bg-green-700 h-9 px-4 rounded-xl font-bold shadow-lg shadow-green-600/20"
 onClick={() => handleAction(request.id, 'approve')}
 disabled={processingId === request.id || !!priceErrors[request.id]}
 >
 {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
 Approve & Activate
 </Button>
 <Button 
 size="sm" 
 variant="ghost" 
 className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-3 rounded-xl font-bold"
 onClick={() => handleAction(request.id, 'reject')}
 disabled={processingId === request.id}
 >
 <XCircle className="w-4 h-4 mr-1.5" />
 Reject
 </Button>
 </div>
 ) : (
 <div className="flex items-center justify-end gap-2 text-zinc-500">
 <Check className="w-4 h-4" />
 <span className="text-xs font-bold uppercase ">Handled</span>
 </div>
 )}
 </TableCell>
 </TableRow>
 );})
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}

function StatsCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
 const colorMap: any = {
 amber: "bg-amber-500/10 border-amber-500/20",
 red: "bg-red-500/10 border-red-500/20",
 purple: "bg-purple-500/10 border-purple-500/20",
 };

 return (
 <div className={`p-6 rounded-3xl border ${colorMap[color]} backdrop-blur-xl relative overflow-hidden group`}>
 <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform">
 {icon}
 </div>
 <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
 <p className="text-4xl font-bold text-white mt-2">{value}</p>
 </div>
 );
}
