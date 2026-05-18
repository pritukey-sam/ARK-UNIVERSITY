'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { 
  Users, Search, MoreVertical, Shield, UserPlus, Trash2, Mail, 
  User as UserIcon, Loader2, BookOpen, Clock, CheckCircle2,
  Calendar, Building2, UserCheck, UserX, ExternalLink,
  ChevronRight, ArrowRight, ShieldAlert, Award, Activity,
  Filter, RotateCcw, X
} from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [hrUsers, setHrUsers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'employee', department: 'Engineering', employee_id: ''
  });
  
  const [assignData, setAssignData] = useState({
    course_id: '', hr_id: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Recently Added');

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, coursesData] = await Promise.all([
        api.admin.getUsers(),
        api.common.getCourses()
      ]);
      setUsers(usersData);
      setCourses(coursesData);
      setHrUsers(usersData.filter((u: any) => u.role === 'hr' || u.role === 'admin' || u.role === 'super_admin'));
    } catch (error: any) {
      toast.error("Failed to load user management data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      return toast.error("Please fill in all required fields");
    }
    try {
      setSubmitting(true);
      await api.admin.createUser(formData);
      toast.success("User successfully added to platform");
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', role: 'employee', department: 'Engineering', employee_id: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.admin.updateUser(selectedUser.id, formData);
      toast.success("User profile updated");
      setIsEditModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to de-activate this user? This will revoke all platform access.")) return;
    try {
      await api.admin.deleteUser(id);
      toast.success("User account de-activated");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to de-activate user");
    }
  };

  const openDetails = (user: any) => {
    router.push(`/users/${user.id}`);
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'Engineering',
      employee_id: user.employee_id || ''
    });
    setIsEditModalOpen(true);
  };

  const openAssign = (user: any) => {
    setSelectedUser(user);
    setIsAssignOpen(true);
    setAssignData({ course_id: '', hr_id: currentUser?.id?.toString() || '' });
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignData.course_id || !assignData.hr_id) return toast.error("Selection incomplete");
    try {
      setSubmitting(true);
      await api.assignments.request({
        user_id: selectedUser.id,
        course_id: parseInt(assignData.course_id),
        hr_id: parseInt(assignData.hr_id)
      });
      toast.success(`Course assignment requested for ${selectedUser.name}`);
      setIsAssignOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Assignment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    let result = users.filter(u => {
      // Base visibility logic
      if (currentUser?.role === 'hr') {
        // HR can see employees and themselves? Or all employees? 
        // Based on previous logic: (u.role === 'employee' || u.role === 'hr')
        if (u.role !== 'employee' && u.role !== 'hr') return false;
      }

      // Search filter
      const searchMatch = !search || 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.employee_id && u.employee_id.toLowerCase().includes(search.toLowerCase()));
      
      if (!searchMatch) return false;

      // Role filter
      if (roleFilter !== 'All') {
        if (u.role !== roleFilter.toLowerCase()) return false;
      }

      // Course filter
      if (courseFilter !== 'All') {
        const hasCourse = u.assigned_courses?.some((c: string) => c === courseFilter);
        if (!hasCourse) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'Name A-Z':
          return a.name.localeCompare(b.name);
        case 'Name Z-A':
          return b.name.localeCompare(a.name);
        case 'Most Active Courses':
          return (b.active_courses_count || 0) - (a.active_courses_count || 0);
        case 'Latest Assignment':
          if (!a.assigned_at) return 1;
          if (!b.assigned_at) return -1;
          return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
        case 'Due Date Nearest':
          const getDueDate = (user: any) => {
            if (!user.assigned_at || !user.latest_course) return Infinity;
            const course = courses.find(c => c.title === user.latest_course);
            const duration = course?.completion_duration_days ?? 30;
            const date = new Date(user.assigned_at);
            date.setDate(date.getDate() + duration);
            return date.getTime();
          };
          const dueA = getDueDate(a);
          const dueB = getDueDate(b);
          return dueA - dueB;
        case 'Recently Added':
          return b.id - a.id;
        default:
          return 0;
      }
    });

    return result;
  }, [users, search, roleFilter, courseFilter, sortBy, currentUser]);

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    hr: users.filter(u => u.role === 'hr').length,
    employees: users.filter(u => u.role === 'employee').length
  };

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">User Management</h1>
          <p className="text-gray-500 font-medium mt-1">Manage workforce identities and curriculum assignments.</p>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
            <Button onClick={() => {
              setFormData({ name: '', email: '', role: 'employee', department: 'Engineering', employee_id: '' });
              setIsAddModalOpen(true);
            }} className="bg-[#F26522] hover:bg-[#D54D10] text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95">
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search users, email, or employee ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-10 border-gray-200 bg-gray-50/50 h-11 focus:bg-white focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-40">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl bg-white font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    {roleFilter === 'All' ? <span>All Users</span> : <SelectValue placeholder="Role" />}
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-gray-100 shadow-xl">
                  <SelectItem value="All">All Users</SelectItem>
                  <SelectItem value="Employee">Employees</SelectItem>
                  <SelectItem value="HR">HR Managers</SelectItem>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                    <SelectItem value="Admin">Platform Admins</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl bg-white font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    {courseFilter === 'All' ? <span>All Courses</span> : <SelectValue placeholder="Course" />}
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-gray-100 shadow-xl max-h-60 overflow-y-auto">
                  <SelectItem value="All">All Courses</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl bg-white font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-gray-400" />
                    <SelectValue placeholder="Sort By" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-gray-100 shadow-xl">
                  <SelectItem value="Recently Added">Recently Added</SelectItem>
                  <SelectItem value="Name A-Z">Name A-Z</SelectItem>
                  <SelectItem value="Name Z-A">Name Z-A</SelectItem>
                  <SelectItem value="Most Active Courses">Most Active</SelectItem>
                  <SelectItem value="Latest Assignment">Latest Assignment</SelectItem>
                  <SelectItem value="Due Date Nearest">Due Date Nearest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(search || roleFilter !== 'All' || courseFilter !== 'All' || sortBy !== 'Recently Added') && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearch('');
                  setRoleFilter('All');
                  setCourseFilter('All');
                  setSortBy('Recently Added');
                }}
                className="h-11 text-gray-500 hover:text-[#F26522] hover:bg-orange-50 font-bold text-xs rounded-xl px-4"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Platform Admins', value: stats.admins, icon: Shield, color: 'text-[#F26522]', bg: 'bg-orange-50' },
          { label: 'HR Managers', value: stats.hr, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Employees', value: stats.employees, icon: UserIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", s.bg, s.color)}><s.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{s.label}</p>
              <p className="text-3xl font-black text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Users Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Employee ID</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Active Courses</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Latest Course</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 bg-gray-100 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-48" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-12 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-24" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? filtered.map((u) => {
                let latestCourseText = u.latest_course || 'No course assigned';
                if (latestCourseText === 'Not Assigned') latestCourseText = 'No course assigned';

                let dueDateText = 'No course assigned';
                if (u.assigned_at && latestCourseText !== 'No course assigned') {
                  const course = courses.find(c => c.title === u.latest_course);
                  const duration = course?.completion_duration_days ?? 30;
                  const date = new Date(u.assigned_at);
                  date.setDate(date.getDate() + duration);
                  if (!isNaN(date.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    dueDateText = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                  }
                }

                const empId = u.employee_id || `${u.role === 'hr' ? 'HR' : u.role === 'employee' ? 'ARK' : 'ADM'}${(u.id).toString().padStart(3, '0')}`;

                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => openDetails(u)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600 border border-gray-200 shrink-0">
                          {u.avatar_initials || u.name?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-[#F26522] transition-colors leading-tight">{u.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{u.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{empId}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{u.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">{u.active_courses_count || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      {latestCourseText !== 'No course assigned' ? (
                        <span className="bg-orange-50 text-[#F26522] font-black uppercase tracking-widest px-2.5 py-1 rounded-md text-[9px]">{latestCourseText}</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">{latestCourseText}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-500">{dueDateText}</td>
                    <td className="px-6 py-4 text-right">
                      <div onClick={(e) => e.stopPropagation()} className="inline-block">
                        <DropdownMenu>
                          <DropdownMenuTrigger 
                            render={
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-gray-900 hover:bg-white border-transparent">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="bg-white border-gray-100 w-48 shadow-2xl rounded-xl p-1">
                            <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5 rounded-lg" onClick={() => openDetails(u)}>
                              <ExternalLink className="w-4 h-4 mr-2 text-gray-400" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5 rounded-lg" onClick={() => openEdit(u)}>
                              <UserIcon className="w-4 h-4 mr-2 text-gray-400" /> Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5 rounded-lg" onClick={() => openAssign(u)}>
                              <BookOpen className="w-4 h-4 mr-2 text-gray-400" /> Assign Course
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-50" />
                            <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5 rounded-lg text-red-600 hover:bg-red-50 focus:text-red-600" onClick={() => handleDelete(u.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    No matching users found in the matrix
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-white sm:max-w-md rounded-2xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Add New User</DialogTitle>
              <DialogDescription className="font-medium">Provision a new account on the Lumina LMS platform.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" className="border-gray-200 h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@company.com" className="border-gray-200 h-11 rounded-xl" />
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white font-black h-12 mt-4 rounded-xl shadow-lg shadow-orange-100">
                {submitting ? 'Creating Account...' : 'Provision Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-white sm:max-w-md rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Edit Profile</DialogTitle>
            <DialogDescription className="font-medium">Update administrative details for this user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="border-gray-200 h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                <Input type="email" value={formData.email} disabled className="border-gray-200 h-11 rounded-xl bg-gray-50 text-gray-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Department</Label>
                <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                  <SelectTrigger className="border-gray-200 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl border-gray-100">
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="border-gray-200 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl border-gray-100">
                    <SelectItem value="employee">Employee</SelectItem>
                    {currentUser?.role !== 'hr' && (
                      <>
                        <SelectItem value="hr">HR Manager</SelectItem>
                        <SelectItem value="admin">Platform Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white font-black h-12 mt-4 rounded-xl shadow-lg shadow-orange-100">
              {submitting ? 'Saving Changes...' : 'Update Profile'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Course Modal */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="bg-white sm:max-w-md rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Assign Curriculum</DialogTitle>
            <DialogDescription className="font-medium">Directly assign a learning track to {selectedUser?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignCourse} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Curriculum Track</Label>
              <Select value={assignData.course_id} onValueChange={v => setAssignData({...assignData, course_id: v})}>
                <SelectTrigger className="border-gray-200 h-12 rounded-xl">
                  <SelectValue placeholder="Choose a course...">
                    {assignData.course_id ? courses?.find(c => c.id.toString() === assignData.course_id)?.title : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-gray-100">
                  {courses.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Approving Authority</Label>
              <Select value={assignData.hr_id} onValueChange={v => setAssignData({...assignData, hr_id: v})}>
                <SelectTrigger className="border-gray-200 h-12 rounded-xl">
                  <SelectValue placeholder="Select admin...">
                    {assignData.hr_id ? (() => {
                      const h = hrUsers?.find(u => u.id.toString() === assignData.hr_id);
                      return h ? `${h.name} (${h.role.toUpperCase()})` : undefined;
                    })() : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-gray-100">
                  {hrUsers.map(h => <SelectItem key={h.id} value={h.id.toString()}>{h.name} ({h.role.toUpperCase()})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3 mt-2">
              <ShieldAlert className="w-5 h-5 text-[#F26522] shrink-0 mt-0.5" />
              <p className="text-[11px] text-orange-800 font-bold uppercase leading-relaxed">
                Assigning this track will trigger an immediate notification and set the standard completion timeline.
              </p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white font-black h-12 mt-4 rounded-xl shadow-lg shadow-orange-100">
              {submitting ? 'Processing Assignment...' : 'Assign Track Now'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
