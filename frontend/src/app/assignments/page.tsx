'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, CheckCircle2, XCircle, Clock, Calendar, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    user_id: '',
    course_id: '',
    requested_due_date: '',
    note: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqData, usersData, coursesData] = await Promise.all([
        api.assignments.getAll(),
        user?.role === 'hr' ? api.admin.getUsers().then((res: any[]) => res.filter(u => u.role === 'employee')) : Promise.resolve([]),
        user?.role === 'hr' ? api.common.getCourses() : Promise.resolve([])
      ]);
      setRequests(reqData);
      if (user?.role === 'hr') {
        setUsers(usersData);
        setCourses(coursesData);
      }
    } catch (error) {
      console.error("Failed to load assignments", error);
      toast.error("Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.course_id) {
      return toast.error("Please select an employee and course");
    }
    try {
      await api.assignments.request({
        user_id: parseInt(formData.user_id),
        course_id: parseInt(formData.course_id),
        hr_id: user.id,
        requested_due_date: formData.requested_due_date ? new Date(formData.requested_due_date).toISOString() : undefined,
        note: formData.note || undefined
      });
      toast.success("Assignment request submitted for approval");
      setIsAddModalOpen(false);
      setFormData({ user_id: '', course_id: '', requested_due_date: '', note: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.assignments.approve(id);
      toast.success("Assignment approved");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.assignments.reject(id);
      toast.success("Assignment rejected");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111]">Assignments {user?.role === 'admin' ? 'Approval' : 'Management'}</h1>
          <p className="text-[#6A6F73] mt-2 text-lg">
            {user?.role === 'admin' ? 'Review and approve pending assignment requests from HR.' : 'Manage course assignments and track approval status.'}
          </p>
        </div>
        {user?.role === 'hr' && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-lg shadow-orange-100 font-bold h-11 px-6 rounded-xl">
                <Plus className="w-5 h-5 mr-2" /> Request Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-md rounded-2xl border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-[#111]">New Assignment Request</DialogTitle>
                <DialogDescription>Submit a course assignment request to Admin for approval.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewRequest} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#6A6F73]">Employee</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#F26522] outline-none"
                    value={formData.user_id}
                    onChange={e => setFormData({...formData, user_id: e.target.value})}
                  >
                    <option value="">Select an employee...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#6A6F73]">Course</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#F26522] outline-none"
                    value={formData.course_id}
                    onChange={e => setFormData({...formData, course_id: e.target.value})}
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#6A6F73]">Requested Due Date (Optional)</Label>
                  <Input 
                    type="date"
                    value={formData.requested_due_date}
                    onChange={e => setFormData({...formData, requested_due_date: e.target.value})}
                    className="border-gray-200 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#6A6F73]">Note to Admin (Optional)</Label>
                  <Input 
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    placeholder="Reason for assignment..."
                    className="border-gray-200 h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white font-black h-12 mt-4 rounded-xl shadow-lg shadow-orange-100">
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-[#eee] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#eee] bg-gray-50/50 px-6 py-5">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#111]">
            <FileText className="w-5 h-5 text-[#F26522]" /> Assignment Requests
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eee] bg-white">
                <th className="py-4 px-6 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Course</th>
                <th className="py-4 px-6 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Due Date</th>
                <th className="py-4 px-6 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Status</th>
                {user?.role === 'admin' && <th className="py-4 px-6 text-xs font-bold text-[#6A6F73] uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-[#111]">{req.user_name}</p>
                    <p className="text-xs text-[#6A6F73]">{req.user_email}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-[#111]">{req.course_title}</p>
                    <p className="text-xs text-[#6A6F73] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> Requested: {formatDate(req.created_at)}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#111]">
                      <Calendar className="w-4 h-4 text-[#6A6F73]" />
                      {formatDate(req.requested_due_date)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="outline" className={cn(
                      "capitalize px-2.5 py-1 text-xs font-bold border",
                      req.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" :
                      req.status === 'approved' ? "bg-green-50 text-green-600 border-green-200" :
                      "bg-red-50 text-red-600 border-red-200"
                    )}>
                      {req.status === 'pending' && <Clock className="w-3 h-3 mr-1 inline-block" />}
                      {req.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1 inline-block" />}
                      {req.status === 'rejected' && <XCircle className="w-3 h-3 mr-1 inline-block" />}
                      {req.status}
                    </Badge>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="py-4 px-6 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => handleApprove(req.id)} className="bg-green-500 hover:bg-green-600 text-white shadow-sm h-8 px-3 text-xs font-bold">
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" onClick={() => handleReject(req.id)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs font-bold">
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-[#6A6F73]">Processed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 5 : 4} className="py-12 text-center text-[#6A6F73]">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No assignment requests found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
