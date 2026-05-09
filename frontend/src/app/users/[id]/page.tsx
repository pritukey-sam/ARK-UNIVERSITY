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

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/users')}
            className="rounded-xl h-10 px-4 bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-all font-bold text-gray-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users Matrix
          </Button>
          <div className="flex gap-3">
             <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[10px] uppercase px-3 py-1 rounded-full">System Account Verified</Badge>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-2xl bg-gray-900 flex items-center justify-center text-white text-3xl font-black shrink-0">
            {user.avatar_initials || user.name[0]}
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
                <Badge className={cn(
                  "font-black text-[10px] uppercase border-none px-3 py-1 rounded-lg",
                  user.role === 'admin' || user.role === 'super_admin' ? 'bg-orange-100 text-[#F26522]' : 
                  user.role === 'hr' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                )}>
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-gray-500 font-bold text-sm">{user.email}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs font-black text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span>By {user.joined_by || 'System Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row removed for clean Curriculum Matrix layout */}

        {/* Main Course List (Curriculum Matrix) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <Award className="w-6 h-6 text-[#F26522]" /> Curriculum Matrix
            </h3>
            <Badge variant="outline" className="border-gray-200 text-gray-400 font-black text-[10px] px-3 py-1 rounded-lg uppercase">
              {course_analytics.length} Tracks
            </Badge>
          </div>
          
          <div className="space-y-4">
            {course_analytics.length > 0 ? course_analytics.map((course: any, idx: number) => (
              <div key={idx} className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col xl:flex-row justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                      <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} alt={course.course_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[22px] font-black text-gray-900 tracking-tight">{course.course_name}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                          <BookOpen className="w-3.5 h-3.5 text-[#F26522]" /> 
                          <div className="flex flex-col leading-tight">
                            <span className="text-[11px] font-black text-gray-700">{course.total_modules || 0}</span>
                            <span className="text-[8px] font-black text-gray-400 tracking-widest">MODULES</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-[#F26522]" /> 
                          <div className="flex flex-col leading-tight">
                            <span className="text-[8px] font-black text-gray-400 tracking-widest">ASSIGNED</span>
                            <span className="text-[11px] font-black text-gray-700">{formatDate(course.enrolled_at || course.last_activity)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                          <Calendar className="w-3.5 h-3.5 text-[#F26522]" /> 
                          <div className="flex flex-col leading-tight">
                            <span className="text-[8px] font-black text-gray-400 tracking-widest">DUE</span>
                            <span className="text-[11px] font-black text-gray-700">{formatDate(course.due_date) || 'NO DATE'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center xl:min-w-[280px] w-full xl:w-auto space-y-2 mt-4 xl:mt-0">
                    <div className="flex justify-between items-end px-1 mb-1">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Completion</span>
                      <span className="text-[16px] font-black text-[#F26522]">{course.progress_percent}%</span>
                    </div>
                    <Progress value={course.progress_percent} className="h-2.5 bg-gray-100 rounded-full" />
                    <div className="flex justify-end pt-2">
                      <Badge className={cn(
                        "font-black text-[9px] uppercase px-4 py-1.5 rounded-full border-none",
                        course.progress_percent === 100 ? "bg-emerald-50 text-emerald-600" : 
                        course.progress_percent > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-500"
                      )}>
                        {course.progress_percent === 100 ? 'Certified' : course.progress_percent > 0 ? 'In Progress' : 'Not Started'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl py-16 text-center">
                <BookOpen className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No curriculum tracks found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
