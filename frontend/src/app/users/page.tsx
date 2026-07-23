'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { 
  Users, Search, MoreVertical, Shield, UserPlus, Trash2, Mail, 
  User as UserIcon, Loader2, BookOpen, Clock, CheckCircle2,
  Calendar, Building2, UserCheck, UserX, ExternalLink,
  ChevronRight, ArrowRight, ShieldAlert, Award, Activity,
  Filter, RotateCcw, X, ChevronDown
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
import { validateEmailField, validateName, validateDesignation, validateEmployeeId } from '@/lib/validation';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [designationError, setDesignationError] = useState('');
  const [employeeIdError, setEmployeeIdError] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [hrUsers, setHrUsers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'employee', department: 'Engineering', designation: '', employee_id: ''
  });
  
  const [assignData, setAssignData] = useState({
    user_id: '', course_id: '', hr_id: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Recently Added');
  
  // Visual limit display toggle
  const [showAllUsers, setShowAllUsers] = useState(false);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchNextId = async (role: string) => {
    try {
      const res = await api.admin.getNextUserId(role);
      setFormData(prev => ({ ...prev, employee_id: res.employee_id }));
    } catch (err) {
      console.error("Failed to load next employee ID:", err);
    }
  };

  useEffect(() => {
    if (isAddModalOpen) {
      fetchNextId(formData.role);
    }
  }, [isAddModalOpen, formData.role]);

  useEffect(() => {
    if (!isEditModalOpen && !isAddModalOpen) {
      setEmailError('');
      setNameError('');
      setDesignationError('');
      setEmployeeIdError('');
    }
  }, [isEditModalOpen, isAddModalOpen]);

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

  const handleEmailChange = (val: string) => {
    setFormData(prev => ({ ...prev, email: val }));
    const check = validateEmailField(val);
    setEmailError(check.isValid ? '' : (check.error || 'Invalid email address'));
  };

  const handleNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, name: val }));
    const check = validateName(val);
    setNameError(check.isValid ? '' : (check.error || 'Invalid name'));
  };

  const handleDesignationChange = (val: string) => {
    setFormData(prev => ({ ...prev, designation: val }));
    const check = validateDesignation(val);
    setDesignationError(check.isValid ? '' : (check.error || 'Invalid designation'));
  };

  const handleEmployeeIdChange = (val: string) => {
    const clean = val.replace(/\s+/g, "");
    setFormData(prev => ({ ...prev, employee_id: clean }));
    const check = validateEmployeeId(clean);
    setEmployeeIdError(check.isValid ? '' : (check.error || 'Invalid employee ID'));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameCheck = validateName(formData.name);
    const emailCheck = validateEmailField(formData.email);
    const designationCheck = validateDesignation(formData.designation);
    const empIdCheck = validateEmployeeId(formData.employee_id);

    if (!nameCheck.isValid) {
      setNameError(nameCheck.error || "Invalid name");
      return toast.error(nameCheck.error || "Invalid name");
    }
    if (!emailCheck.isValid) {
      setEmailError(emailCheck.error || "Invalid email");
      return toast.error(emailCheck.error || "Invalid email");
    }
    if (!designationCheck.isValid) {
      setDesignationError(designationCheck.error || "Invalid designation");
      return toast.error(designationCheck.error || "Invalid designation");
    }
    if (!empIdCheck.isValid) {
      setEmployeeIdError(empIdCheck.error || "Invalid employee ID");
      return toast.error(empIdCheck.error || "Invalid employee ID");
    }

    try {
      setSubmitting(true);
      await api.admin.createUser(formData);
      toast.success("User successfully added to platform");
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', role: 'employee', department: 'Engineering', designation: '', employee_id: '' });
      setEmailError('');
      setNameError('');
      setDesignationError('');
      setEmployeeIdError('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameCheck = validateName(formData.name);
    const emailCheck = validateEmailField(formData.email);
    const designationCheck = validateDesignation(formData.designation);
    const empIdCheck = validateEmployeeId(formData.employee_id);

    if (!nameCheck.isValid) {
      setNameError(nameCheck.error || "Invalid name");
      return toast.error(nameCheck.error || "Invalid name");
    }
    if (!emailCheck.isValid) {
      setEmailError(emailCheck.error || "Invalid email");
      return toast.error(emailCheck.error || "Invalid email");
    }
    if (!designationCheck.isValid) {
      setDesignationError(designationCheck.error || "Invalid designation");
      return toast.error(designationCheck.error || "Invalid designation");
    }
    if (!empIdCheck.isValid) {
      setEmployeeIdError(empIdCheck.error || "Invalid employee ID");
      return toast.error(empIdCheck.error || "Invalid employee ID");
    }

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
      designation: user.designation || '',
      employee_id: user.employee_id || ''
    });
    setEmailError('');
    setNameError('');
    setDesignationError('');
    setEmployeeIdError('');
    setIsEditModalOpen(true);
  };

  const openAssign = (user: any) => {
    setSelectedUser(user);
    setIsAssignOpen(true);
    setAssignData({
      user_id: user.id.toString(),
      course_id: '',
      hr_id: currentUser?.id?.toString() || ''
    });
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignData.user_id || !assignData.course_id || !assignData.hr_id) return toast.error("Selection incomplete");
    
    const targetUser = users.find(u => u.id.toString() === assignData.user_id);
    const targetCourse = courses.find(c => c.id.toString() === assignData.course_id);
    if (targetUser && targetCourse) {
      const isAlreadyEnrolled = targetUser.assigned_courses?.some((title: string) => title.toLowerCase() === targetCourse.title.toLowerCase());
      if (isAlreadyEnrolled) {
        return toast.error("User is already enrolled in this course");
      }
    }

    try {
      setSubmitting(true);
      await api.assignments.request({
        user_id: parseInt(assignData.user_id),
        course_id: parseInt(assignData.course_id),
        hr_id: parseInt(assignData.hr_id)
      });
      const targetUser = users.find(u => u.id.toString() === assignData.user_id);
      toast.success(`Course assigned successfully to ${targetUser?.name || 'user'}`);
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
      const uRole = (u.role || '').toLowerCase();

      // Hide/remove Admin and Super Admin accounts from this users listing
      if (uRole === 'admin' || uRole === 'super_admin' || uRole === 'platform_admin') return false;

      // Base visibility logic
      if (currentUser?.role === 'hr') {
        // HR can see employees and themselves? Or all employees? 
        // Based on previous logic: (u.role === 'employee' || u.role === 'hr')
        if (uRole !== 'employee' && uRole !== 'hr' && uRole !== 'hr_manager' && uRole !== 'hr manager') return false;
      }

      // Search filter
      const searchMatch = !search || 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.employee_id && u.employee_id.toLowerCase().includes(search.toLowerCase()));
      
      if (!searchMatch) return false;

      // Role filter
      if (roleFilter !== 'All') {
        const fRole = roleFilter.toLowerCase();
        if (fRole === 'hr') {
          if (uRole !== 'hr' && uRole !== 'hr_manager' && uRole !== 'hr manager') return false;
        } else if (fRole === 'employee') {
          if (uRole !== 'employee') return false;
        } else {
          if (uRole !== fRole) return false;
        }
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
    total: users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r !== 'admin' && r !== 'super_admin' && r !== 'platform_admin';
    }).length,
    admins: users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r === 'admin' || r === 'super_admin' || r === 'platform_admin';
    }).length,
    hr: users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r === 'hr' || r === 'hr_manager' || r === 'hr manager';
    }).length,
    employees: users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r === 'employee';
    }).length
  };

  const isHr = currentUser?.role === 'hr';
  const totalEmployees = users.filter(u => (u.role || '').toLowerCase() === 'employee');
  const totalActiveCoursesCount = totalEmployees.reduce((sum, u) => sum + (u.active_courses_count || 0), 0);
  const dueCoursesCount = totalEmployees.filter(u => {
    if (!u.assigned_at || !u.latest_course || u.latest_course === 'Not Assigned') return false;
    if ((u.active_courses_count || 0) === 0) return false;
    return true;
  }).length;

  const hrCards = [
    { label: 'Total Employees', value: stats.employees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Courses', value: totalActiveCoursesCount, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Due Courses', value: dueCoursesCount, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const adminCards = [
    { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'HR Managers', value: stats.hr, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Employees', value: stats.employees, icon: UserIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const cardsToRender = isHr ? hrCards : adminCards;

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">User Management</h1>
          <p className="text-gray-500 font-medium mt-1">Manage workforce identities and course assignments.</p>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
            <Button onClick={() => {
              setFormData({ name: '', email: '', role: 'employee', department: 'Engineering', designation: '', employee_id: '' });
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
              <Select value={roleFilter} onValueChange={v => setRoleFilter(v as string)}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl bg-white font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    {roleFilter === 'All' ? <span>All Users</span> : <SelectValue placeholder="Role" />}
                  </div>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start" className="bg-white rounded-xl border-gray-100 shadow-xl w-[var(--anchor-width)]">
                  <SelectItem value="All">All Users</SelectItem>
                  <SelectItem value="Employee">Employees</SelectItem>
                  <SelectItem value="HR">HR Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={courseFilter} onValueChange={v => setCourseFilter(v as string)}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl bg-white font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    {courseFilter === 'All' ? <span>All Courses</span> : <SelectValue placeholder="Course" />}
                  </div>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start" className="bg-white rounded-xl border-gray-100 shadow-xl max-h-60 overflow-y-auto w-[var(--anchor-width)]">
                  <SelectItem value="All">All Courses</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={sortBy} onValueChange={v => setSortBy(v as string)}>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl bg-white font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-gray-400" />
                    <SelectValue placeholder="Sort By" />
                  </div>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start" className="bg-white rounded-xl border-gray-100 shadow-xl w-[var(--anchor-width)]">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cardsToRender.map((s, i) => (
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
              ) : filtered.length > 0 ? filtered.slice(0, showAllUsers ? undefined : 10).map((u) => {
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
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600 border border-gray-200 shrink-0 overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            u.avatar_initials || u.name?.[0]
                          )}
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
                            {currentUser?.role !== 'hr' && (
                              <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5 rounded-lg" onClick={() => openEdit(u)}>
                                <UserIcon className="w-4 h-4 mr-2 text-gray-400" /> Edit User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5 rounded-lg" onClick={() => openAssign(u)}>
                              <BookOpen className="w-4 h-4 mr-2 text-gray-400" /> Assign Course
                            </DropdownMenuItem>
                            {currentUser?.role !== 'hr' && (
                              <>
                                <DropdownMenuSeparator className="bg-gray-50" />
                                <DropdownMenuItem 
                                  className="cursor-pointer font-bold text-xs py-2.5 rounded-lg text-red-600 hover:bg-red-50 focus:text-red-600" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserToDelete(u);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete User
                                </DropdownMenuItem>
                              </>
                            )}
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
        {filtered.length > 10 && (
          <div className="flex justify-center py-4 border-t border-gray-50">
            <Button
              variant="outline"
              onClick={() => setShowAllUsers(!showAllUsers)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold h-11 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              {showAllUsers ? "See Less" : "Load More"}
            </Button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-white sm:max-w-md rounded-2xl border border-gray-100 shadow-2xl p-6 md:p-8 [&>button]:rounded-full [&>button]:hover:bg-gray-100 [&>button]:transition-colors">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Add New User</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">Create a new account for an employee or HR.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></Label>
                <Input value={formData.name} onChange={e => handleNameChange(e.target.value)} onBlur={e => handleNameChange(e.target.value)} placeholder="John Doe" className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", nameError && "border-red-500 focus-visible:ring-red-500")} required />
                {nameError && <p className="text-red-500 text-xs mt-1 font-bold">{nameError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={formData.email} onChange={e => handleEmailChange(e.target.value)} onBlur={e => handleEmailChange(e.target.value)} placeholder="john@company.com" className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", emailError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")} required />
                {emailError && <p className="text-red-500 text-xs mt-1 font-bold">{emailError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designation <span className="text-red-500">*</span></Label>
                <Input value={formData.designation} onChange={e => handleDesignationChange(e.target.value)} onBlur={e => handleDesignationChange(e.target.value)} placeholder="e.g. AI Engineer" className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", designationError && "border-red-500 focus-visible:ring-red-500")} required />
                {designationError && <p className="text-red-500 text-xs mt-1 font-bold">{designationError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</Label>
                <Input 
                  value={formData.employee_id || ""} 
                  onChange={e => handleEmployeeIdChange(e.target.value)} 
                  onBlur={e => handleEmployeeIdChange(e.target.value)} 
                  placeholder="ARK016" 
                  className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200 font-mono", employeeIdError && "border-red-500 focus-visible:ring-red-500")} 
                />
                {employeeIdError && <p className="text-red-500 text-xs mt-1 font-bold">{employeeIdError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role <span className="text-red-500">*</span></Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v as string})}>
                  <SelectTrigger className="border-gray-200 h-11 rounded-xl px-4 focus:ring-1 focus:ring-[#F26522] hover:border-gray-300 transition-all">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl border-gray-150 shadow-xl animate-in fade-in-50 duration-100">
                    <SelectItem value="employee" className="cursor-pointer">employee</SelectItem>
                    <SelectItem value="hr" className="cursor-pointer">hr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={submitting || !!emailError || !!nameError || !!designationError || !!employeeIdError} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white font-bold h-12 mt-4 rounded-xl shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200/50 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Adding...' : 'Add User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-white sm:max-w-md rounded-2xl border border-gray-100 shadow-2xl p-6 md:p-8 [&>button]:rounded-full [&>button]:hover:bg-gray-100 [&>button]:transition-colors">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Edit Profile</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">Update administrative details for this user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</Label>
                <Input value={formData.name} onChange={e => handleNameChange(e.target.value)} onBlur={e => handleNameChange(e.target.value)} className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", nameError && "border-red-500 focus-visible:ring-red-500")} required />
                {nameError && <p className="text-red-500 text-xs mt-1 font-bold">{nameError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</Label>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => handleEmailChange(e.target.value)} 
                  onBlur={e => handleEmailChange(e.target.value)}
                  className={cn(
                    "border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200",
                    emailError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500"
                  )}
                  required
                />
                {emailError && <p className="text-red-500 text-xs mt-1 font-bold">{emailError}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designation <span className="text-red-500">*</span></Label>
              <Input value={formData.designation} onChange={e => handleDesignationChange(e.target.value)} onBlur={e => handleDesignationChange(e.target.value)} placeholder="e.g. AI Engineer" className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", designationError && "border-red-500 focus-visible:ring-red-500")} required />
              {designationError && <p className="text-red-500 text-xs mt-1 font-bold">{designationError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</Label>
              <Input 
                value={formData.employee_id || ""} 
                onChange={e => handleEmployeeIdChange(e.target.value)} 
                onBlur={e => handleEmployeeIdChange(e.target.value)} 
                placeholder="ARK016" 
                className={cn("border-gray-200 h-11 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200 font-mono", employeeIdError && "border-red-500 focus-visible:ring-red-500")} 
              />
              {employeeIdError && <p className="text-red-500 text-xs mt-1 font-bold">{employeeIdError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role <span className="text-red-500">*</span></Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v as string})}>
                <SelectTrigger className="border-gray-200 h-11 rounded-xl px-4 focus:ring-1 focus:ring-[#F26522] hover:border-gray-300 transition-all">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-gray-150 shadow-xl">
                  <SelectItem value="employee">employee</SelectItem>
                  <SelectItem value="hr">hr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting || !!emailError || !!nameError || !!designationError || !!employeeIdError} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white font-bold h-12 mt-4 rounded-xl shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200/50 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Saving Changes...' : 'Update Profile'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Course Modal */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Assign Course</DialogTitle>
            <DialogDescription>Enroll a user into a specific course.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignCourse} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <div className="relative">
                <div 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-white"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <span className="truncate">
                    {assignData.user_id ? (() => {
                      const u = users?.find(u => u.id.toString() === assignData.user_id);
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
                        {(users?.filter(u => (u.role || '').toLowerCase() === 'employee').filter(u => {
                          if (!userSearchQuery.trim()) return true;
                          const term = userSearchQuery.toLowerCase();
                          return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                        }) || []).map(u => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setAssignData({ ...assignData, user_id: u.id.toString() });
                              setUserDropdownOpen(false);
                              setUserSearchQuery('');
                            }}
                            className="flex w-full items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-slate-100 cursor-pointer transition-colors text-[#111]"
                          >
                            {u.name} ({u.email})
                          </div>
                        ))}
                        {users?.filter(u => (u.role || '').toLowerCase() === 'employee').filter(u => {
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
                    {assignData.course_id ? (() => {
                      const c = courses?.find(c => c.id.toString() === assignData.course_id);
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
                              setAssignData({ ...assignData, course_id: c.id.toString() });
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
            {currentUser?.role === 'admin' && (
              <div className="space-y-2">
                <Label>Choose HR</Label>
                <Select value={assignData.hr_id} onValueChange={v => setAssignData({...assignData, hr_id: v as string})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select HR...">
                      {assignData.hr_id ? (() => {
                        const h = hrUsers?.find(u => u.id.toString() === assignData.hr_id);
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
            )}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-800 flex gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                Due date will be automatically calculated based on course duration.
              </p>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
                {submitting ? "Assigning..." : "Assign Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="De-activate User"
        description="Are you sure you want to de-activate this user? This will revoke all platform access."
        itemName={userToDelete?.name}
        trigger={null}
        onConfirm={async () => {
          if (userToDelete) {
            await handleDelete(userToDelete.id);
            setUserToDelete(null);
          }
        }}
      />
    </div>
  );
}
