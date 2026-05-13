'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, Clock, Search, BookOpen, Calendar,
  TrendingUp, Activity, UserPlus, Trophy, Users, AlertCircle, LayoutDashboard,
  Bell, FileText, ArrowUpRight, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell 
} from 'recharts';
import { useAuth } from '@/context/AuthContext';

export default function HRDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [hrMembers, setHrMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({ user_id: '', course_id: '', requested_due_date: '', note: '' });
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserData, setAddUserData] = useState({ name: '', email: '', password: '', role: 'employee', department: 'Engineering', employee_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aData, pData, progData, uData, cData, actData] = await Promise.all([
        api.hr.getHrAnalytics(),
        api.assignments.getPending(),
        api.hr.getEmployeeProgress(),
        api.admin.getUsers(),
        api.common.getCourses(),
        api.dashboard.getActivity()
      ]);
      
      setAnalytics(aData);
      setPending(pData);
      setAssigned(progData);
      setUsers(uData.filter((u: any) => u.role === 'employee'));
      setHrMembers(uData.filter((u: any) => u.role === 'hr'));
      setCourses(cData);
      setActivity(actData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNewAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.course_id) return toast.error("Please select an employee and course");
    setSubmitting(true);
    try {
      await api.assignments.request({
        user_id: parseInt(formData.user_id),
        course_id: parseInt(formData.course_id),
        hr_id: user?.id,
        requested_due_date: formData.requested_due_date ? new Date(formData.requested_due_date).toISOString() : undefined,
        note: formData.note || undefined
      });
      toast.success("Assignment requested");
      setOpen(false);
      setFormData({ user_id: '', course_id: '', requested_due_date: '', note: '' });
      fetchData();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserData.name || !addUserData.email || !addUserData.password) {
      return toast.error("Please fill in all required fields");
    }
    try {
      setSubmitting(true);
      await api.admin.createUser(addUserData);
      toast.success("User successfully added to platform");
      setIsAddUserOpen(false);
      setAddUserData({ name: '', email: '', password: '', role: 'employee', department: 'Engineering', employee_id: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const safeSearch = (search || '').toLowerCase();

  const filteredAssigned = assigned.filter(a =>
    (a?.employee_name || '').toLowerCase().includes(safeSearch) ||
    (a?.course_title || '').toLowerCase().includes(safeSearch)
  );
  
  const overdueTrainings = assigned.filter(a => a.is_overdue);

  if (loading && !analytics) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[600px] space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-[#F26522]/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-[#6A6F73] animate-pulse font-medium">Loading HR operations center...</p>
    </div>
  );

  if (!mounted) return null;

  const kpis = [
    { label: 'Total Employees', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Courses', value: courses.length, icon: BookOpen, color: 'text-[#F26522]', bg: 'bg-orange-50' },
    { label: 'Completed Trainings', value: analytics?.stats?.totalCompletions || 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending / In Progress', value: assigned.filter(a => a.status === 'in-progress').length + pending.length, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Overdue Trainings', value: overdueTrainings.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completion Rate', value: `${analytics?.stats?.completionRate || 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-8 space-y-8 bg-[#f8f9fa] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-[#F26522]" />
            <h1 className="text-3xl font-extrabold text-[#111] tracking-tight">HR Management Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 text-[#6A6F73]">
            <span className="text-sm font-medium">Track workforce progress and manage learning paths</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="border-[#eee] bg-white shadow-sm" onClick={() => router.push('/users')}>
            <Users className="w-4 h-4 mr-2" /> View All Users
          </Button>
          
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm transition-all hover:scale-[1.02]">
                  <Plus className="w-4 h-4 mr-2" /> Assign Course
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Assign Course</DialogTitle>
                <DialogDescription>Enroll a user into a specific course.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewAssignment} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Select value={formData.user_id} onValueChange={v => setFormData({...formData, user_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a learner...">
                        {formData.user_id ? (() => {
                          const u = users?.find(u => u.id.toString() === formData.user_id);
                          return u ? `${u.name} (${u.email})` : undefined;
                        })() : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Course</Label>
                  <Select value={formData.course_id} onValueChange={v => setFormData({...formData, course_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course...">
                        {formData.course_id ? courses?.find(c => c.id.toString() === formData.course_id)?.title : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date (Optional)</Label>
                  <Input 
                    type="date"
                    value={formData.requested_due_date}
                    onChange={e => setFormData({...formData, requested_due_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason / Note (Optional)</Label>
                  <Input 
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    placeholder="E.g., Required for Q3 compliance"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800 flex gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    If due date is left blank, it will be automatically calculated based on course duration upon approval.
                  </p>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
                    {submitting ? "Assigning..." : "Assign Course"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>


        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="border-[#eee] shadow-sm hover:shadow-md transition-all duration-300 bg-white group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#6A6F73]">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-[#111]">{kpi.value}</h3>
                  </div>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", kpi.bg)}>
                  <kpi.icon className={cn("w-6 h-6", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Table: Assignments */}
          <Card className="border-[#eee] shadow-sm bg-white overflow-hidden flex flex-col">
            <CardHeader className="border-b border-[#eee] bg-white px-6 py-5 flex flex-row items-center justify-between sticky top-0 z-10">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#F26522]" /> Recent Assignments
                </CardTitle>
                <CardDescription>Track all active and completed employee courses</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
                <Input 
                  placeholder="Search assignments..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 border-[#eee] bg-gray-50 focus:bg-white focus:border-[#F26522] transition-colors text-sm"
                />
              </div>
            </CardHeader>
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b border-[#eee]">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#6A6F73] uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee]">
                  {filteredAssigned.length > 0 ? filteredAssigned.map((a, i) => (
                    <tr key={`assignment-${i}`} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => router.push(`/users`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F26522]/10 text-[#F26522] flex items-center justify-center font-bold text-xs shrink-0">
                            {(a.employee_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#111] group-hover:text-[#F26522] transition-colors">{a.employee_name}</p>
                            <p className="text-xs text-[#6A6F73]">{a.employee_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#111]">{a.course_title}</td>
                      <td className="px-6 py-4 text-sm text-[#6A6F73]">{formatDate(a.assigned_at).split(' ')[0]}</td>
                      <td className="px-6 py-4">
                        {a.due_date ? (
                          <span className={cn("text-sm font-medium", a.is_overdue && !a.status.includes('completed') ? "text-red-600" : "text-[#6A6F73]")}>
                            {formatDate(a.due_date).split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No deadline</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge className={cn(
                          "border-none font-bold text-[10px] px-2.5 py-1 uppercase tracking-wider shadow-none",
                          a.status.includes('completed') ? "bg-green-100 text-green-700" : 
                          a.is_overdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {a.status.replace('-', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-[#6A6F73]">
                          <Search className="w-8 h-8 mb-3 opacity-20" />
                          <p className="text-sm font-medium">No assignments found</p>
                          <p className="text-xs mt-1 opacity-70">Try adjusting your search query</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="border-[#eee] shadow-sm bg-white">
            <CardHeader className="border-b border-[#eee] px-6 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Upcoming & Overdue Deadlines
              </CardTitle>
            </CardHeader>
            <div className="p-0">
              {overdueTrainings.length > 0 ? (
                <div className="divide-y divide-[#eee]">
                  {overdueTrainings.slice(0, 5).map((a, i) => (
                    <div key={i} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111]">{a.employee_name}</p>
                          <p className="text-xs font-medium text-[#6A6F73] mt-0.5">{a.course_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">Overdue</p>
                        <p className="text-xs text-[#6A6F73] mt-0.5">{formatDate(a.due_date).split(' ')[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#111]">All caught up!</p>
                  <p className="text-xs text-[#6A6F73] mt-1">There are no overdue trainings to track.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Learning Progress Overview */}
          <Card className="border-[#eee] shadow-sm bg-white flex flex-col min-h-[400px]">
            <CardHeader className="border-b border-[#eee] px-6 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#F26522]" /> Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              <div className="h-[260px] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={260}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: analytics?.stats?.totalCompletions || 0 },
                        { name: 'In Progress', value: assigned.filter(a => a.status === 'in-progress').length },
                        { name: 'Overdue', value: overdueTrainings.length },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#3B82F6" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 600, color: '#111' }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10B981]" /><span className="text-xs font-medium text-[#6A6F73]">Done</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]" /><span className="text-xs font-medium text-[#6A6F73]">Active</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#EF4444]" /><span className="text-xs font-medium text-[#6A6F73]">Late</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-[#eee] shadow-sm bg-white flex flex-col h-[500px]">
            <CardHeader className="border-b border-[#eee] px-6 py-5 flex flex-row items-center justify-between sticky top-0 bg-white z-10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#F26522]" /> Live Activity
              </CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              {activity.length > 0 ? (
                <div className="divide-y divide-[#eee]">
                  {activity.map((item, i) => (
                    <div key={i} className="p-4 px-6 hover:bg-gray-50 transition-colors flex gap-4">
                      <div className="mt-0.5">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          item.type === 'submission' ? "bg-purple-100 text-purple-600" :
                          item.type === 'course_assigned' ? "bg-blue-100 text-blue-600" :
                          "bg-green-100 text-green-600"
                        )}>
                          {item.type === 'submission' ? <CheckCircle2 className="w-4 h-4" /> :
                           item.type === 'course_assigned' ? <BookOpen className="w-4 h-4" /> :
                           <Activity className="w-4 h-4" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111] leading-snug">{item.message}</p>
                        <p className="text-xs text-[#6A6F73] mt-1.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {formatDate(item.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#6A6F73]">
                  <Bell className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No recent activity</p>
                  <p className="text-xs mt-1">Actions will appear here in real-time</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
