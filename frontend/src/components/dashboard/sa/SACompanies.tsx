'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Ban, PlayCircle, Clock, AlertTriangle, CheckCircle2, Building2, DollarSign, Users, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SACompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [newCompany, setNewCompany] = useState({ name: '', plan_type: 'free', plan_price: 0, admin_name: '', admin_email: '', admin_password: '', expiry_date: '' });

  const fetchCompanies = async () => {
    try { setCompanies(await api.superAdmin.getCompanies()); }
    catch { toast.error('Failed to load companies'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async () => {
    try {
      await api.superAdmin.createCompany(newCompany);
      toast.success('Company added successfully');
      setIsDialogOpen(false);
      setNewCompany({ name: '', plan_type: 'free', plan_price: 0, admin_name: '', admin_email: '', admin_password: '', expiry_date: '' });
      fetchCompanies();
    } catch (e: any) { toast.error(e.message || 'Failed to add company'); }
  };

  const handleUpdate = async () => {
    try {
      await api.superAdmin.updateCompany(editingCompany.id, {
        name: editingCompany.name, plan_type: editingCompany.plan_type,
        plan_price: editingCompany.plan_price, is_suspended: editingCompany.is_suspended,
        expiry_date: editingCompany.expiry_date
      });
      toast.success('Company updated');
      setEditingCompany(null);
      fetchCompanies();
    } catch (e: any) { toast.error(e.message || 'Failed to update company'); }
  };

  const getStatus = (c: any) => {
    if (c.is_suspended) return { label: 'Suspended', cls: 'bg-red-50 text-red-600', icon: Ban };
    if (!c.employee_count) return { label: 'Inactive', cls: 'bg-orange-50 text-orange-600', icon: AlertTriangle };
    return { label: 'Active', cls: 'bg-green-50 text-green-600', icon: CheckCircle2 };
  };

  const getExpiryDays = (d: string) => {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#111]">Manage Companies</h1>
          <p className="text-[#6A6F73] mt-1">{companies.length} organizations registered on the platform.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger 
            render={
              <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Company
              </Button>
            }
          />
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>Register a new organization and create its primary admin account.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select value={newCompany.plan_type} onValueChange={(v: any) => setNewCompany({...newCompany, plan_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Plan</SelectItem>
                      <SelectItem value="paid">Premium Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCompany.plan_type === 'paid' && (
                  <div className="space-y-2">
                    <Label>Price (₹/month)</Label>
                    <Input type="number" value={newCompany.plan_price} onChange={e => setNewCompany({...newCompany, plan_price: Number(e.target.value)})} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Plan Expiry</Label>
                  <Input type="date" value={newCompany.expiry_date} onChange={e => setNewCompany({...newCompany, expiry_date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Admin Name</Label>
                  <Input value={newCompany.admin_name} onChange={e => setNewCompany({...newCompany, admin_name: e.target.value})} placeholder="John Admin" />
                </div>
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input type="email" value={newCompany.admin_email} onChange={e => setNewCompany({...newCompany, admin_email: e.target.value})} placeholder="admin@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label>Admin Password</Label>
                  <Input type="password" value={newCompany.admin_password} onChange={e => setNewCompany({...newCompany, admin_password: e.target.value})} placeholder="••••••••" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-[#F26522] hover:bg-[#D54D10] text-white">Create Company</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
        <Input 
          placeholder="Search companies..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="pl-10 bg-white border-[#eee]" 
        />
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-white rounded-xl animate-pulse border border-[#eee]" />
        )) : filtered.map((company) => {
          const status = getStatus(company);
          const expiryDays = getExpiryDays(company.expiry_date);
          return (
            <Card key={company.id} className="bg-white border-[#eee] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#F26522] text-xl font-bold border border-[#eee]">
                      {company.name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#111]">{company.name}</h3>
                      <p className="text-xs text-[#6A6F73] mt-1">ID: {company.company_code || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={cn("border-none", status.cls)}>
                      <status.icon className="w-3 h-3 mr-1" /> {status.label}
                    </Badge>
                    {expiryDays !== null && (
                      <span className={cn("text-[10px] font-bold px-2 py-1 rounded bg-white text-[#6A6F73]", expiryDays < 15 && "text-red-600 bg-red-50")}>
                        {expiryDays <= 0 ? 'Expired' : `${expiryDays} days left`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-3 text-center border border-[#eee]">
                    <div className="text-[10px] font-bold text-[#6A6F73] uppercase mb-1 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" /> Users
                    </div>
                    <div className="text-lg font-bold text-[#111]">{company.employee_count || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-[#eee]">
                    <div className="text-[10px] font-bold text-[#6A6F73] uppercase mb-1 flex items-center justify-center gap-1">
                      <DollarSign className="w-3 h-3" /> Revenue
                    </div>
                    <div className="text-lg font-bold text-[#111]">₹{company.plan_price || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-[#eee]">
                    <div className="text-[10px] font-bold text-[#6A6F73] uppercase mb-1 flex items-center justify-center gap-1">
                      <Activity className="w-3 h-3" /> Plan
                    </div>
                    <div className="text-lg font-bold text-[#111] uppercase">{company.plan_type}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-[#eee]">
                  <p className="text-xs text-[#6A6F73]">Last active: {new Date().toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingCompany(company)} className="border-[#eee] h-9">
                      Edit
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={cn("h-9 w-9", company.is_suspended ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50")}
                      onClick={() => {
                        if (confirm(`${company.is_suspended ? 'Activate' : 'Suspend'} ${company.name}?`)) {
                          api.superAdmin.updateCompany(company.id, { is_suspended: !company.is_suspended })
                            .then(() => { toast.success('Status updated'); fetchCompanies(); })
                            .catch(e => toast.error(e.message));
                        }
                      }}
                    >
                      {company.is_suspended ? <PlayCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white border border-[#eee] rounded-xl">
          <Building2 className="w-12 h-12 text-[#6A6F73] mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-[#111]">No companies found</h3>
          <p className="text-[#6A6F73] mt-1">Try adjusting your search filters.</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCompany} onOpenChange={open => !open && setEditingCompany(null)}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Modify details for {editingCompany?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={editingCompany?.name || ''} onChange={e => setEditingCompany({...editingCompany, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select value={editingCompany?.plan_type || 'free'} onValueChange={(v: any) => setEditingCompany({...editingCompany, plan_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free Plan</SelectItem>
                    <SelectItem value="paid">Premium Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Price (₹)</Label>
                <Input type="number" value={editingCompany?.plan_price || 0} onChange={e => setEditingCompany({...editingCompany, plan_price: Number(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingCompany?.is_suspended ? 'suspended' : 'active'} onValueChange={(v: any) => setEditingCompany({...editingCompany, is_suspended: v === 'suspended'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={editingCompany?.expiry_date ? new Date(editingCompany.expiry_date).toISOString().split('T')[0] : ''} onChange={e => setEditingCompany({...editingCompany, expiry_date: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCompany(null)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-[#F26522] hover:bg-[#D54D10] text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
