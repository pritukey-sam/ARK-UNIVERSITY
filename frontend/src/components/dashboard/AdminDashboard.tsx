'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users, BookOpen, Activity, Plus, UserPlus,
  TrendingUp, CheckCircle2, Clock, Trophy, AlertCircle,
  BarChart3, RefreshCw, Filter, Search as SearchIcon,
  Calendar, UserCheck, GraduationCap, ArrowUpRight,
  ChevronRight, MoreHorizontal, Bell, Mail, Phone,
  ShieldCheck, LayoutDashboard, Bookmark, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, Pie, PieChart as RePieChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAllActivity, setShowAllActivity] = useState(false);

  // Form States
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    completion_duration_days: 30
  });

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'employee',
    department: 'Engineering',
    designation: '',
    employee_id: ''
  });

  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    course_id: '',
    assigned_by: user?.name || 'Admin',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Comparison States
  const [comparisonMode, setComparisonMode] = useState<'monthly' | 'daily'>('monthly');
  const [monthA, setMonthA] = useState('');
  const [monthB, setMonthB] = useState('');
  const [dayA, setDayA] = useState(new Date().toISOString().split('T')[0]);
  const [dayB, setDayB] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setMounted(true);
    fetchAll();
    
    // Auto-refresh every 30 seconds to keep data live as requested
    const refreshInterval = setInterval(() => {
      fetchAll();
    }, 30000);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(timer);
    };
  }, []);

  const fetchNextId = async (role: string) => {
    try {
      const res = await api.admin.getNextUserId(role);
      setUserForm(prev => ({ ...prev, employee_id: res.employee_id }));
    } catch (err) {
      console.error("Failed to load next employee ID:", err);
    }
  };

  useEffect(() => {
    if (isUserModalOpen) {
      fetchNextId(userForm.role);
    }
  }, [isUserModalOpen, userForm.role]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [statsData, analyticsData, activityData, coursesData, usersData] = await Promise.all([
        api.common.getStats(),
        api.dashboard.getAnalytics(),
        api.dashboard.getActivity(),
        api.common.getCourses(),
        api.admin.getUsers()
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setActivity(activityData);
      setCourses(coursesData);
      setAllUsers(usersData);
    } catch (error) { 
      console.error(error); 
      toast.error("Failed to load dashboard data");
    } finally { 
      setLoading(false); 
    }
  };

  // Sync comparison months when analytics data arrives
  useEffect(() => {
    if (analytics?.userGrowth?.length >= 2 && !monthA && !monthB) {
      setMonthA(analytics.userGrowth[analytics.userGrowth.length - 2].month);
      setMonthB(analytics.userGrowth[analytics.userGrowth.length - 1].month);
    } else if (analytics?.userGrowth?.length === 1 && !monthB) {
      setMonthB(analytics.userGrowth[0].month);
    }
  }, [analytics, monthA, monthB]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.description) return toast.error("Please fill required fields");
    
    setSubmitting(true);
    try {
      await api.admin.createCourse(courseForm);
      toast.success("Course created successfully!");
      setIsCourseModalOpen(false);
      setCourseForm({ title: '', description: '', thumbnail_url: '', completion_duration_days: 30 });
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return toast.error("Please fill required fields");
    
    setSubmitting(true);
    try {
      await api.admin.createUser(userForm);
      toast.success("User added successfully!");
      setIsUserModalOpen(false);
      setUserForm({ name: '', email: '', role: 'employee', department: 'Engineering', designation: '', employee_id: '' });
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.employee_id || !assignForm.course_id) return toast.error("Please select user and course");
    
    setSubmitting(true);
    try {
      await api.hr.assignCourse({
        employee_id: parseInt(assignForm.employee_id),
        course_id: parseInt(assignForm.course_id),
        notes: assignForm.notes
      });
      toast.success("Course assigned successfully!");
      setIsAssignModalOpen(false);
      setAssignForm({ employee_id: '', course_id: '', assigned_by: user?.name || 'Admin', notes: '' });
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign course");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !stats) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[600px] space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-[#F26522]/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-[#6A6F73] animate-pulse font-medium">Loading your command center...</p>
    </div>
  );

  if (!mounted) return null;

  const kpis = [
    { label: 'Total Users', value: allUsers?.filter(u => u.role === 'employee').length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: stats?.userGrowthTrend || '0% this month' },
    { label: 'Total Courses', value: stats?.totalCourses || 0, icon: BookOpen, color: 'text-[#F26522]', bg: 'bg-orange-50', trend: stats?.courseTrend || '+0 new courses' },
    { label: 'Total Enrollments', value: stats?.totalAssignments || 0, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50', trend: stats?.engagementTrend || '0% engagement' },
    { label: 'Completions', value: stats?.completedAssignments || 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', trend: stats?.successTrend || '0% success rate' },
  ];


  const COLORS = ['#F26522', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  return (
    <div className="p-8 space-y-8 bg-[#f8f9fa] min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-[#F26522]" />
            <h1 className="text-3xl font-extrabold text-[#111] tracking-tight">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 text-[#6A6F73]">
            <span className="text-sm font-medium">Welcome back, {user?.name || 'Administrator'}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Create Course Modal */}
          <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
            <DialogTrigger
              render={
                <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm transition-all hover:scale-[1.02]">
                  <Plus className="w-4 h-4 mr-2" /> Create Course
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>Add a new course to your learning library.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCourse} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Name <span className="text-red-500">*</span></Label>
                  <Input id="title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} placeholder="e.g. Advanced React Patterns" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Course Description <span className="text-red-500">*</span></Label>
                  <Textarea id="desc" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} placeholder="Describe what learners will achieve..." className="min-h-[100px]" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Completion Duration (Days)</Label>
                  <Input id="duration" type="number" value={courseForm.completion_duration_days} onChange={e => setCourseForm({...courseForm, completion_duration_days: parseInt(e.target.value) || 0})} min="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Thumbnail URL</Label>
                  <Input id="image" value={courseForm.thumbnail_url} onChange={e => setCourseForm({...courseForm, thumbnail_url: e.target.value})} placeholder="https://example.com/image.jpg" />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCourseModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Course"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add User Modal */}
          <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" className="border-[#eee] hover:bg-gray-50 transition-all hover:scale-[1.02]">
                  <UserPlus className="w-4 h-4 mr-2" /> Add User
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new account for an employee or HR.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <Input id="name" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  <Input id="email" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="john@company.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation <span className="text-red-500">*</span></Label>
                  <Input id="designation" value={userForm.designation} onChange={e => setUserForm({...userForm, designation: e.target.value})} placeholder="e.g. AI Engineer" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID (Auto-Generated)</Label>
                  <Input id="employee_id" value={userForm.employee_id} disabled className="bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={userForm.role} onValueChange={v => setUserForm({...userForm, role: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="hr">HR Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
                    {submitting ? "Adding..." : "Add User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Assign Course Modal */}
          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" className="border-[#eee] hover:bg-gray-50 transition-all hover:scale-[1.02]">
                  <Bookmark className="w-4 h-4 mr-2" /> Assign Course
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Assign Course</DialogTitle>
                <DialogDescription>Enroll a user into a specific course.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAssignCourse} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Select value={assignForm.employee_id} onValueChange={v => setAssignForm({...assignForm, employee_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a learner...">
                        {assignForm.employee_id ? (() => {
                          const u = allUsers?.find(u => u.id.toString() === assignForm.employee_id);
                          return u ? `${u.name} (${u.email})` : undefined;
                        })() : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Course</Label>
                  <Select value={assignForm.course_id} onValueChange={v => setAssignForm({...assignForm, course_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course...">
                        {assignForm.course_id ? courses?.find(c => c.id.toString() === assignForm.course_id)?.title : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {user?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label>Choose HR</Label>
                    <Select value={assignForm.assigned_by} onValueChange={v => setAssignForm({...assignForm, assigned_by: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select HR...">
                          {assignForm.assigned_by || undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers?.filter(u => u.role === 'hr').map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800 flex gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    Due date will be automatically calculated based on course duration.
                  </p>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
                    {submitting ? "Assigning..." : "Assign Course"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k, i) => (
          <Card key={i} className="relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
            <div className={cn("absolute top-0 left-0 w-1 h-full", k.color.replace('text-', 'bg-'))} />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-[#6A6F73] uppercase tracking-wider mb-1">{k.label}</p>
                  <p className="text-3xl font-extrabold text-[#111]">{k.value}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>{k.trend}</span>
                  </div>
                </div>
                <div className={cn("p-3 rounded-xl", k.bg, k.color)}>
                  <k.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analytics Section */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b border-slate-50">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold text-slate-900 tracking-tight">Growth Comparison</CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-400">Compare signups between months</CardDescription>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-100">
                  <button 
                    onClick={() => setComparisonMode('monthly')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                      comparisonMode === 'monthly' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setComparisonMode('daily')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                      comparisonMode === 'daily' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Daily
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {comparisonMode === 'monthly' ? (
                    <>
                      {(() => {
                        const monthsList = [];
                        const now = new Date();
                        for (let i = 0; i < 12; i++) {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          monthsList.push(d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear());
                        }
                        
                        return (
                          <>
                            <Select value={monthA} onValueChange={setMonthA}>
                              <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold border-none bg-transparent">
                                <SelectValue placeholder="Month A" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-100">
                                {monthsList.map((m: string) => (
                                  <SelectItem key={m} value={m} className="text-[10px] font-bold">{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-[10px] font-black text-slate-300 px-1">VS</span>
                            <Select value={monthB} onValueChange={setMonthB}>
                              <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold border-none bg-transparent">
                                <SelectValue placeholder="Month B" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-100">
                                {monthsList.map((m: string) => (
                                  <SelectItem key={m} value={m} className="text-[10px] font-bold">{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="date" 
                        value={dayA} 
                        onChange={(e) => setDayA(e.target.value)} 
                        className="w-[130px] h-7 text-[10px] font-bold border-none bg-transparent focus-visible:ring-0"
                      />
                      <span className="text-[10px] font-black text-slate-300 px-1">VS</span>
                      <Input 
                        type="date" 
                        value={dayB} 
                        onChange={(e) => setDayB(e.target.value)} 
                        className="w-[130px] h-7 text-[10px] font-bold border-none bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {(() => {
                let dataA, dataB, labelA, labelB;
                
                if (comparisonMode === 'monthly') {
                  dataA = analytics?.userGrowth?.find((d: any) => d.month === monthA) || { count: 0 };
                  dataB = analytics?.userGrowth?.find((d: any) => d.month === monthB) || { count: 0 };
                  labelA = monthA;
                  labelB = monthB;
                } else {
                  // Range-based cumulative logic for Daily mode
                  const start = new Date(dayA);
                  start.setHours(0, 0, 0, 0);
                  
                  const end = new Date(dayB);
                  end.setHours(23, 59, 59, 999);

                  // Point A: Total users created strictly BEFORE the start date
                  const countA = allUsers?.filter(u => {
                    if (!u.created_at) return false;
                    const uDate = new Date(u.created_at);
                    return uDate < start;
                  }).length || 0;

                  // Point B: Total users created ON OR BEFORE the end date
                  const countB = allUsers?.filter(u => {
                    if (!u.created_at) return false;
                    const uDate = new Date(u.created_at);
                    return uDate <= end;
                  }).length || 0;

                  dataA = { count: countA };
                  dataB = { count: countB };
                  labelA = new Date(dayA).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                  labelB = new Date(dayB).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                }

                const growthDiff = dataB.count - dataA.count;
                const growthVal = dataA.count > 0 ? Math.round((growthDiff / dataA.count) * 100) : growthDiff * 100;
                const isUp = growthDiff >= 0;

                const compData = [
                  { name: labelA, count: dataA.count },
                  { name: 'Comparison', count: (dataA.count + dataB.count) / 2 },
                  { name: labelB, count: dataB.count }
                ];

                return (
                  <>
                    <div>
                      <div className="flex items-baseline gap-3">
                        <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                          {comparisonMode === 'daily' ? `+${growthDiff}` : dataB.count}
                        </h4>
                        <div className={cn(
                          "flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg",
                          isUp ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                        )}>
                          {isUp ? "↑" : "↓"} {Math.abs(growthVal)}% Growth
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {comparisonMode === 'daily' 
                          ? `${growthDiff} new users added between ${labelA} and ${labelB}`
                          : (isUp ? `Growth increased from ${labelA} to ${labelB}` : `${labelB} gained fewer users than ${labelA}`)
                        }
                      </p>
                    </div>

                    <div className="h-[220px] w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={compData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="mountainGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F26522" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#F26522" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length && payload[0].payload.name !== 'Comparison') {
                                return (
                                  <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{payload[0].payload.name}</p>
                                    <p className="text-lg font-black text-slate-900">{payload[0].value} Users</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#F26522" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#mountainGradient)" 
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 border-t border-slate-50 pt-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                        <span>{labelA} • {dataA.count} USERS</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-900">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>{labelB} • {dataB.count} USERS</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 border-b border-[#eee]">
                <CardTitle className="text-base font-bold">Course Completion Rates</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[250px] w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                    <BarChart data={analytics?.completionRate?.slice(0, 5) || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="title" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6A6F73'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6A6F73'}} />
                      <Tooltip />
                      <Bar dataKey="completed" fill="#F26522" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-4 border-b border-[#eee]">
                <CardTitle className="text-base font-bold">Role Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center">
                {(() => {
                  const roleData = [
                    { name: 'Employees', value: allUsers?.filter(u => u.role === 'employee').length || 0 },
                    { name: 'HR Managers', value: allUsers?.filter(u => u.role === 'hr').length || 0 },
                    { name: 'Admins', value: allUsers?.filter(u => u.role === 'admin').length || 0 },
                  ].filter(d => d.value > 0);
                  const hasData = roleData.length > 0;
                  return (
                    <>
                      <div className="h-[200px] w-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={180}>
                          <RePieChart>
                            <Pie
                              data={hasData ? roleData : [{ name: 'No Data', value: 1 }]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={hasData ? 5 : 0}
                              dataKey="value"
                            >
                              {(hasData ? roleData : [{ name: 'No Data', value: 1 }]).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={hasData ? COLORS[index % COLORS.length] : '#e5e7eb'} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-4 w-full mt-4">
                        {roleData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs font-medium text-[#6A6F73]">{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Smart Insights & Recently Created Courses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Card: Smart Insights */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-[#eee] flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#F26522]" />
                  Smart Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs font-bold text-[#6A6F73] uppercase tracking-wider mb-3">Recently Added Users</p>
                <div className="space-y-3">
                  {[...(allUsers || [])]
                    .sort((a, b) => {
                      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 4)
                    .map((u, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F26522]/10 text-[#F26522] flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#111] truncate">{u.name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                      </div>
                    ))}
                  {(!allUsers || allUsers.length === 0) && (
                    <p className="text-sm text-[#6A6F73] text-center py-2">No users yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Recently Created Courses */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-[#eee] flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#F26522]" />
                  Recently Created Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs font-bold text-[#6A6F73] uppercase tracking-wider mb-3">Recently Created Courses</p>
                <div className="space-y-3">
                  {courses?.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => router.push(`/courses/${c.id}`)}>
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F26522] flex items-center justify-center text-xs font-bold shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111] truncate">{c.title}</p>
                        <p className="text-xs text-[#6A6F73]">{c.completion_duration_days || 30} days duration</p>
                      </div>
                    </div>
                  ))}
                  {(!courses || courses.length === 0) && (
                    <p className="text-sm text-[#6A6F73] text-center py-2">No courses yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          {/* Quick Stats Overview */}
          <Card className="border-none shadow-sm">
            <CardHeader className="py-5 border-b border-[#eee]">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {(() => {
                const total = stats?.totalAssignments || 0;
                const completed = stats?.completedAssignments || 0;
                const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                const overdue = stats?.overdueAssignments || 0;
                const onTrackRate = total > 0 ? Math.max(0, Math.round(((total - overdue) / total) * 100)) : 0;
                return (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6A6F73] font-medium">Completion Rate</span>
                        <span className="font-bold text-[#111]">{completionRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F26522] rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6A6F73] font-medium">On-Track Enrollments</span>
                        <span className="font-bold text-[#111]">{onTrackRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${onTrackRate}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6A6F73] font-medium">Course Utilization</span>
                        <span className="font-bold text-[#111]">{stats?.totalCourses || 0} courses</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (stats?.totalCourses || 0) * 10)}%` }} />
                      </div>
                    </div>
                  </>
                );
              })()}

              <Separator className="bg-[#f0f0f0]" />

              <div className="space-y-4">
                <p className="text-xs font-bold text-[#6A6F73] uppercase tracking-wider">Top Courses</p>
                {courses?.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => router.push(`/courses/${c.id}`)}>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-[#111] border border-[#eee] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#111] truncate">{c.title}</p>
                      <p className="text-xs text-[#6A6F73]">{c.total_modules || 0} modules</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                ))}
                {(!courses || courses.length === 0) && (
                  <p className="text-sm text-[#6A6F73] text-center py-2">No courses yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-none shadow-sm">
            <CardHeader className="py-5 border-b border-[#eee] flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#F26522]" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-[#6A6F73] hover:text-[#F26522] text-xs font-bold" onClick={() => setShowAllActivity(!showAllActivity)}>
                {showAllActivity ? 'Show Less' : 'View All'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className={cn("divide-y divide-[#f0f0f0] overflow-y-auto custom-scrollbar", showAllActivity ? 'max-h-[1200px]' : 'max-h-[400px]')}>
                {(showAllActivity ? activity : activity.slice(0, 8)).length > 0 ? (showAllActivity ? activity : activity.slice(0, 8)).map((item, i) => (
                  <div key={i} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        item.type === 'quiz_attempt' ? "bg-orange-100 text-orange-600" : 
                        item.type === 'user_registered' ? "bg-blue-100 text-blue-600" :
                        item.type === 'submission' ? "bg-purple-100 text-purple-600" :
                        "bg-green-100 text-green-600"
                      )}>
                        {item.type === 'quiz_attempt' ? <Trophy className="w-4 h-4" /> : 
                         item.type === 'user_registered' ? <UserPlus className="w-4 h-4" /> :
                         item.type === 'submission' ? <Plus className="w-4 h-4" /> :
                         <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#111] leading-tight mb-1">{item.message}</p>
                        <div className="flex items-center gap-2 text-[10px] text-[#6A6F73] font-medium uppercase tracking-wide">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.time)}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-[#6A6F73] font-medium">No recent activity found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
