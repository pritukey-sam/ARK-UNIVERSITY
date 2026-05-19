'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Mail, Shield, Calendar, BookOpen, CheckCircle2, 
  Clock, Trophy, Activity, BarChart3, ChevronRight, TrendingUp, 
  Circle, AlertTriangle, Zap, User as UserIcon, Building2,
  Award, MapPin, Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getUserDetails(parseInt(id));
      setData(res);
    } catch (error: any) {
      if (error.status === 403) {
        toast.error("Access denied: Insufficient permissions.");
        router.push('/users');
      } else {
        toast.error(error.message || 'Failed to load user profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-10 w-48 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-40 bg-gray-100 rounded-2xl" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
      </div>
      <div className="h-96 bg-gray-100 rounded-2xl" />
    </div>
  );

  if (!data) return null;

  const { user, stats, course_analytics, recent_activity } = data;

  // Custom Display Sorting:
  // 1. Ongoing first: progress > 0% and < 100%
  // 2. Completed second: progress === 100%
  // 3. Not Started last: progress === 0%
  const sortedCourses = [...(course_analytics || [])].sort((a: any, b: any) => {
    const getCategoryScore = (course: any) => {
      const pct = course.progress_percent || 0;
      if (pct > 0 && pct < 100) return 1; // Ongoing (First)
      if (pct === 100) return 2;          // Completed (Second)
      return 3;                           // Not Started (Third)
    };
    
    const scoreA = getCategoryScore(a);
    const scoreB = getCategoryScore(b);
    
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    
    // Stable alphabetical sort as secondary criteria
    return (a.course_name || "").localeCompare(b.course_name || "");
  });

  return (
    <div className="min-h-screen bg-[#FAFBFC] p-6 md:p-8 lg:p-12 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/users')}
            className="rounded-lg h-9 px-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-bold uppercase tracking-wider gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
              <Shield className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Verified Identity</span>
            </div>
          </div>
        </div>

        {/* ── SECTION 1: PROFILE HEADER ── */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-6 md:p-8 relative overflow-hidden group">
          {/* Subtle Accent Gradient */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F26522] to-orange-400 opacity-80" />
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar Section */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 text-2xl font-bold shadow-sm transition-transform group-hover:scale-105 duration-300">
                {user.avatar_initials || user.name[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                <Activity className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            {/* User Info Section */}
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">{user.name}</h1>
                  <Badge className={cn(
                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border-none shadow-none",
                    user.role === 'admin' || user.role === 'super_admin' ? 'bg-orange-50 text-[#F26522]' : 
                    user.role === 'hr' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  )}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </div>
                {user.designation && (
                  <p className="text-sm font-extrabold text-[#F26522] tracking-wide mt-1">{user.designation}</p>
                )}
                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 mt-1">
                  <Mail className="w-3.5 h-3.5 opacity-40" />
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
              </div>
              
              {/* Metadata Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-3 pt-2 border-t border-gray-100">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Joined Date</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                    <Calendar className="w-3 h-3 text-gray-300" />
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Added By</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                    <Building2 className="w-3 h-3 text-gray-300" />
                    <span>{user.joined_by || 'System Admin'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">User Role</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                    <Briefcase className="w-3 h-3 text-gray-300" />
                    <span className="capitalize">{user.role || 'Standard User'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: CURRICULUM MATRIX ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F26522]" /> Assign Courses
              </h3>
              <p className="text-xs font-medium text-gray-400">Track and view student course progress.</p>
            </div>
            <div className="bg-gray-100/50 border border-gray-200 px-3 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{course_analytics.length} Active Courses</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {sortedCourses.length > 0 ? sortedCourses.map((course: any, idx: number) => {
              const isCompleted = course.progress_percent === 100;
              const isStarted = course.progress_percent > 0;
              
              return (
                <Card key={idx} className="bg-white border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:border-orange-100 transition-all duration-300 rounded-2xl group cursor-default">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center min-h-[100px]">
                      
                      {/* Left: Thumbnail & Title */}
                      <div className="flex items-center gap-5 p-5 flex-1 min-w-0">
                        <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 group-hover:border-orange-100/50 transition-colors">
                          <img 
                            src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} 
                            alt={course.course_name} 
                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" 
                          />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h4 className="text-[15px] font-bold text-gray-900 leading-tight truncate group-hover:text-[#F26522] transition-colors">
                            {course.course_name}
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                              <BookOpen className="w-3 h-3" />
                              <span>{course.total_modules || 0} Modules</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-gray-200" />
                            <Badge className="bg-gray-50 text-gray-500 border-none px-2 py-0 h-4 text-[9px] font-bold uppercase">Course</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Center: Schedule Information */}
                      <div className="hidden xl:grid grid-cols-2 gap-x-12 px-8 border-l border-gray-50 py-4 h-full min-w-[340px]">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Assigned</span>
                          <div className="flex items-center gap-2 text-gray-600 font-bold text-xs">
                            <Clock className="w-3.5 h-3.5 opacity-30" />
                            <span>{formatDate(course.enrolled_at || course.last_activity)}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Deadline</span>
                          <div className="flex items-center gap-2 text-gray-600 font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5 opacity-30" />
                            <span className={cn(
                              !course.due_date ? "text-gray-400 italic" : "text-gray-600"
                            )}>{formatDate(course.due_date) || 'Open Ended'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress & Status */}
                      <div className="flex items-center gap-6 p-5 lg:pl-8 lg:pr-8 border-t lg:border-t-0 lg:border-l border-gray-50 bg-gray-50/20 lg:min-w-[280px]">
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between items-end px-0.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Status</span>
                            <span className={cn(
                              "text-sm font-black tracking-tight",
                              isCompleted ? "text-emerald-500" : isStarted ? "text-[#F26522]" : "text-gray-400"
                            )}>
                              {course.progress_percent}%
                            </span>
                          </div>
                          <div className="relative h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "absolute left-0 top-0 h-full transition-all duration-1000 ease-out rounded-full",
                                isCompleted ? "bg-emerald-500" : isStarted ? "bg-[#F26522]" : "bg-gray-300"
                              )}
                              style={{ width: `${course.progress_percent}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="shrink-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300",
                            isCompleted ? "bg-emerald-50 border-emerald-100 text-emerald-500" : 
                            isStarted ? "bg-orange-50 border-orange-100 text-[#F26522]" : "bg-gray-50 border-gray-100 text-gray-400"
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isStarted ? <TrendingUp className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="bg-white border border-gray-200 border-dashed rounded-3xl py-20 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-8 h-8 text-gray-200" />
                </div>
                <h4 className="text-gray-900 font-bold mb-1">No Active Courses</h4>
                <p className="text-gray-400 text-sm font-medium">This user has not been assigned any courses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
