'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, CheckCircle2, XCircle, Clock, Calendar, Check, X, AlertCircle, Bookmark, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [hrUsers, setHrUsers] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [submitting, setSubmitting] = useState(false);
  
  // Visual limit display toggle
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  
  const [formData, setFormData] = useState({
    user_id: '',
    course_id: '',
    hr_id: '',
    requested_due_date: '',
    note: ''
  });

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const isAuthority = user?.role === 'hr' || user?.role === 'admin';
      const [reqData, usersData, coursesData] = await Promise.all([
        api.assignments.getAll(),
        isAuthority ? api.admin.getUsers() : Promise.resolve([]),
        isAuthority ? api.common.getCourses() : Promise.resolve([])
      ]);
      setRequests(reqData);
      if (isAuthority) {
        setUsers(usersData.filter((u: any) => u.role === 'employee'));
        setHrUsers(usersData.filter((u: any) => u.role === 'hr' || u.role === 'admin'));
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
    if (user) {
      fetchData();
      setFormData(prev => ({ ...prev, hr_id: user.id.toString() }));
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && users.length > 0 && courses.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const userId = searchParams.get('userId');
      const courseId = searchParams.get('courseId');
      const assign = searchParams.get('assign');
      if (assign === 'true' && userId && courseId) {
        setFormData(prev => ({
          ...prev,
          user_id: userId,
          course_id: courseId,
        }));
        setIsAddModalOpen(true);
        // Clear query parameters from address bar
        const newUrl = window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [users, courses]);

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.course_id) {
      return toast.error("Please select an employee and course");
    }
    
    const targetUser = users.find(u => u.id.toString() === formData.user_id);
    const targetCourse = courses.find(c => c.id.toString() === formData.course_id);
    if (targetUser && targetCourse) {
      const isAlreadyEnrolled = targetUser.assigned_courses?.some((title: string) => title.toLowerCase() === targetCourse.title.toLowerCase());
      if (isAlreadyEnrolled) {
        return toast.error("User is already enrolled in this course");
      }
      
      const alreadyHasRequest = requests.some(r => 
        r.user_id.toString() === formData.user_id && 
        r.course_id.toString() === formData.course_id &&
        (r.status === 'pending' || r.status === 'approved')
      );
      if (alreadyHasRequest) {
        const req = requests.find(r => r.user_id.toString() === formData.user_id && r.course_id.toString() === formData.course_id);
        if (req?.status === 'pending') {
          return toast.error("Course already assigned to this user");
        } else {
          return toast.error("User is already enrolled in this course");
        }
      }
    }

    setSubmitting(true);
    try {
      await api.assignments.request({
        user_id: parseInt(formData.user_id),
        course_id: parseInt(formData.course_id),
        hr_id: formData.hr_id ? parseInt(formData.hr_id) : (user?.id || 0),
        requested_due_date: formData.requested_due_date ? new Date(formData.requested_due_date).toISOString() : undefined,
        note: formData.note || undefined
      });
      toast.success("Course assigned successfully");
      setIsAddModalOpen(false);
      setFormData({ user_id: '', course_id: '', hr_id: user?.id?.toString() || '', requested_due_date: '', note: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
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

  const handleCancel = async (id: number) => {
    try {
      await api.assignments.cancel(id);
      toast.success("Assignment cancelled");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel assignment");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getComputedDueDate = (req: any) => {
    if (req.requested_due_date) return new Date(req.requested_due_date);
    const durationDays = req.completion_duration_days || 30;
    const baseDate = req.approval_timestamp ? new Date(req.approval_timestamp) : new Date(req.created_at);
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + durationDays);
    return dueDate;
  };

  const getComputedStatus = (req: any) => {
    if (req.status === 'approved') {
      const dueDate = getComputedDueDate(req);
      if (dueDate && new Date() > dueDate && (req.progress_percent || 0) < 100) {
        return 'overdue';
      }
    }
    return req.status;
  };

  const getRemainingDays = (req: any) => {
    const computedStatus = getComputedStatus(req);
    if (computedStatus === 'rejected') return '-';
    
    const dueDate = getComputedDueDate(req);
    if (!dueDate) return 'No due date';

    const diffTime = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffTime < 0) return `Overdue by ${Math.abs(diffTime)} days`;
    if (diffTime === 0) return 'Due today';
    if (diffTime === 1) return '1 day left';
    return `${diffTime} days left`;
  };

  const filteredRequests = requests.filter(req => {
    const computedStatus = getComputedStatus(req);
    if (filter === 'All') return true;
    if (filter === 'Pending') return computedStatus === 'pending';
    if (filter === 'Approved') return computedStatus === 'approved';
    if (filter === 'Rejected') return computedStatus === 'rejected';
    if (filter === 'Overdue') return computedStatus === 'overdue';
    return true;
  });

  return (
    <div className="p-8 max-w-full mx-auto space-y-8 bg-[#f8f9fa] min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111] tracking-tight">Assignment Management</h1>
          <p className="text-[#6A6F73] mt-2 text-sm font-medium">
            {user?.role === 'admin' ? 'Review and manage all corporate learning assignments.' : 'Assign courses to your workforce and track progress.'}
          </p>
        </div>
        {(user?.role === 'hr' || user?.role === 'admin') && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger
              render={
                <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm transition-all hover:scale-[1.02]">
                  <Bookmark className="w-4 h-4 mr-2" /> Assign Course
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Assign Course</DialogTitle>
                <DialogDescription>Enroll a user into a specific course.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewRequest} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <div className="relative">
                    <div 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-white"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    >
                      <span className="truncate">
                        {formData.user_id ? (() => {
                          const u = users?.find(u => u.id.toString() === formData.user_id);
                          return u ? `${u.name} (${u.email})` : "Choose a learner...";
                        })() : "Choose a learner..."}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </div>

                    {userDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[290]" onClick={() => setUserDropdownOpen(false)} />
                        <div className="absolute z-[300] mt-1 w-full rounded-md border bg-popover p-2 text-popover-foreground shadow-md outline-none bg-white">
                          <Input
                            placeholder="Type to search user..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="mb-2 h-9 text-xs focus:ring-1 focus:ring-[#F26522] focus:border-transparent rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                            {(users?.filter(u => {
                              if (!userSearchQuery.trim()) return true;
                              const term = userSearchQuery.toLowerCase();
                              return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                            }) || []).map(u => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setFormData({ ...formData, user_id: u.id.toString() });
                                  setUserDropdownOpen(false);
                                  setUserSearchQuery('');
                                }}
                                className="flex w-full items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-slate-100 cursor-pointer transition-colors text-[#111]"
                              >
                                {u.name} ({u.email})
                              </div>
                            ))}
                            {users?.filter(u => {
                              if (!userSearchQuery.trim()) return true;
                              const term = userSearchQuery.toLowerCase();
                              return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                            }).length === 0 && (
                              <div className="py-2 text-center text-xs text-muted-foreground">No users found</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Select Course</Label>
                  <div className="relative">
                    <div 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-white"
                      onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
                    >
                      <span className="truncate">
                        {formData.course_id ? (() => {
                          const c = courses?.find(c => c.id.toString() === formData.course_id);
                          return c ? c.title : "Choose a course...";
                        })() : "Choose a course..."}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </div>

                    {courseDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[290]" onClick={() => setCourseDropdownOpen(false)} />
                        <div className="absolute z-[300] mt-1 w-full rounded-md border bg-popover p-2 text-popover-foreground shadow-md outline-none bg-white">
                          <Input
                            placeholder="Type to search course..."
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                            className="mb-2 h-9 text-xs focus:ring-1 focus:ring-[#F26522] focus:border-transparent rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                            {(courses?.filter(c => {
                              if (!courseSearchQuery.trim()) return true;
                              const term = courseSearchQuery.toLowerCase();
                              return c.title.toLowerCase().includes(term);
                            }) || []).map(c => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setFormData({ ...formData, course_id: c.id.toString() });
                                  setCourseDropdownOpen(false);
                                  setCourseSearchQuery('');
                                }}
                                className="flex w-full items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-slate-100 cursor-pointer transition-colors text-[#111]"
                              >
                                {c.title}
                              </div>
                            ))}
                            {courses?.filter(c => {
                              if (!courseSearchQuery.trim()) return true;
                              const term = courseSearchQuery.toLowerCase();
                              return c.title.toLowerCase().includes(term);
                            }).length === 0 && (
                              <div className="py-2 text-center text-xs text-muted-foreground">No courses found</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Choose HR</Label>
                  <Select value={formData.hr_id} onValueChange={(value) => setFormData({...formData, hr_id: value as string})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select HR...">
                        {formData.hr_id ? (() => {
                          const h = hrUsers?.find(u => u.id.toString() === formData.hr_id);
                          return h ? `${h.name} (${h.email})` : undefined;
                        })() : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {hrUsers?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800 flex gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    Due date will be automatically calculated based on course duration.
                  </p>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
                    {submitting ? "Assigning..." : "Assign Course"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-[#eee] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#eee] bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            {['All', 'Pending', 'Approved', 'Overdue', 'Rejected'].map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={cn(
                  "text-xs font-bold h-8 rounded-full",
                  filter === f ? "bg-gray-900 text-white hover:bg-gray-800 border-none" : "text-[#6A6F73] border-[#eee] hover:bg-gray-50"
                )}
              >
                {f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eee] bg-gray-50/50">
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Employee ID</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Course</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Requested By</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Requested Date</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Due Date</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Time Left</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Progress</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {filteredRequests.slice(0, showAllAssignments ? undefined : 10).map(req => {
                const computedStatus = getComputedStatus(req);
                const computedDueDate = getComputedDueDate(req);
                const isOverdue = computedStatus === 'overdue';

                return (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-[#111]">{req.user_name}</p>
                      <p className="text-xs text-[#6A6F73]">{req.user_email}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#111] font-medium">
                      {req.employee_id || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-[#111]">{req.course_title}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#111] font-medium whitespace-nowrap">
                      {req.requested_by === 'Employee Self Request' ? 'Employee Self Request' : (req.requested_by && (req.requested_by.includes('(Admin)') || req.requested_by.toLowerCase() === 'admin') ? 'Admin' : (req.requested_by || 'Unknown'))}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-[#111] font-medium">{formatDate(req.created_at)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className={cn("text-sm font-medium", isOverdue ? "text-red-600 font-bold" : "text-[#111]")}>
                        {computedDueDate ? formatDate(computedDueDate.toISOString()) : 'N/A'}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <p className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-[#111]")}>
                        {getRemainingDays(req)}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      {req.status === 'approved' ? (
                        <div className="w-24 space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-[#111]">
                            <span>{req.progress_percent || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-500", (req.progress_percent || 0) === 100 ? "bg-green-500" : "bg-blue-600")}
                              style={{ width: `${req.progress_percent || 0}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#6A6F73] italic">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <Badge variant="outline" className={cn(
                          "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                          computedStatus === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          computedStatus === 'approved' ? "bg-green-50 text-green-700 border-green-200" :
                          computedStatus === 'overdue' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-gray-100 text-gray-600 border-gray-200"
                        )}>
                          {computedStatus === 'pending' && <Clock className="w-3 h-3 mr-1 inline-block" />}
                          {computedStatus === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1 inline-block" />}
                          {computedStatus === 'overdue' && <AlertCircle className="w-3 h-3 mr-1 inline-block" />}
                          {computedStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1 inline-block" />}
                          {computedStatus}
                        </Badge>
                        {req.approval_timestamp && (
                          <p className="text-[10px] text-[#6A6F73]" title={formatDateTime(req.approval_timestamp)}>
                            Approved {formatDate(req.approval_timestamp)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {req.status === 'pending' && user?.role === 'admin' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => handleApprove(req.id)} className="bg-green-500 hover:bg-green-600 text-white shadow-sm h-8 px-3 text-xs font-bold">
                            Approve
                          </Button>
                          <Button size="sm" onClick={() => handleReject(req.id)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs font-bold">
                            Reject
                          </Button>
                        </div>
                      ) : req.status === 'pending' && user?.role === 'hr' ? (
                         <Button size="sm" onClick={() => handleCancel(req.id)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs font-bold">
                           <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel
                         </Button>
                      ) : (
                         <span className="text-xs text-[#6A6F73] font-medium italic">No action required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#6A6F73]">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No assignments found for this filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRequests.length > 10 && (
          <div className="flex justify-center py-4 border-t border-[#eee]">
            <Button
              variant="outline"
              onClick={() => setShowAllAssignments(!showAllAssignments)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold h-11 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              {showAllAssignments ? "See Less" : "Load More"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
