'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen, CheckCircle2, Clock, PlayCircle, Trophy, ArrowRight,
  Activity, Bell, Star, TrendingUp, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesData, activityData, analyticsData] = await Promise.all([
        api.employee.getMyCourses(),
        api.dashboard.getActivity(),
        api.employee.getEmployeeAnalytics()
      ]);
      setCourses(coursesData);
      setActivity(activityData);
      setAnalytics(analyticsData);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Recently' : date.toLocaleString();
  };

  const stats = {
    total: courses.length,
    completed: courses.filter(c => c.status === 'completed').length,
    inProgress: courses.filter(c => c.status !== 'completed').length,
    avgScore: analytics?.avgScore || 0
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F26522]"></div>
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="bg-white p-8 rounded-xl border border-[#eee] shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[#111]">Welcome back, {user?.name}!</h1>
            <p className="text-[#6A6F73]">You've completed {stats.completed} courses. Your average quiz score is {stats.avgScore}%.</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#111]">{stats.total}</p>
              <p className="text-xs text-[#6A6F73] font-bold uppercase">Assigned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-[#6A6F73] font-bold uppercase">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#F26522]">{stats.avgScore}%</p>
              <p className="text-xs text-[#6A6F73] font-bold uppercase">Avg. Score</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#111]">Continue Learning</h2>
            <Link href="/courses">
              <Button variant="ghost" className="text-[#F26522] hover:bg-orange-50 font-bold">
                Browse Library <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => {
                const progress = course.status === 'completed' ? 100 : 
                  course.total_modules > 0 ? Math.round((course.completed_modules / course.total_modules) * 100) : 0;
                
                return (
                  <Link key={course.id} href={`/courses/${course.id}`}>
                    <Card className="hover:shadow-md transition-all border border-[#eee] bg-white h-full group">
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-[#F26522]">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <Badge className={cn(
                            "border-none text-[10px] font-bold uppercase",
                            course.status === 'completed' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {course.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-[#111] group-hover:text-[#F26522] transition-colors">{course.title}</h3>
                          <p className="text-xs text-[#6A6F73] mt-1 line-clamp-2">{course.description}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-[#6A6F73]">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-[#eee]">
                            <div 
                              className={cn("h-full transition-all duration-500", course.status === 'completed' ? "bg-green-500" : "bg-[#F26522]")} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed border-2 border-[#eee] bg-white">
              <PlayCircle className="w-12 h-12 text-[#6A6F73] mx-auto mb-4 opacity-20" />
              <p className="text-[#6A6F73] font-medium">No courses assigned yet.</p>
              <Link href="/courses">
                <Button variant="link" className="text-[#F26522] font-bold mt-2">Browse Library</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Activity Sidebar */}
        <div className="space-y-8">
          <Card className="p-6 bg-white border border-[#eee] shadow-sm">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Activity className="w-5 h-5 text-[#F26522]" />
            </CardHeader>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {activity.length > 0 ? activity.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-[#eee] rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="mt-1">
                    {item.type === 'quiz_attempt' ? <Trophy className="w-4 h-4 text-orange-500" /> : 
                     item.type === 'submission' ? <Plus className="w-4 h-4 text-purple-500" /> :
                     <BookOpen className="w-4 h-4 text-green-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111]">{item.message}</p>
                    <p className="text-xs text-[#6A6F73] mt-1">{formatDate(item.time)}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-[#6A6F73] text-sm">No recent activity</div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#eee] shadow-sm">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Learning Achievements</CardTitle>
              <Star className="w-5 h-5 text-yellow-500" />
            </CardHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-white rounded shadow-sm"><Trophy className="w-4 h-4 text-[#F26522]" /></div>
                <div>
                  <p className="text-xs font-bold text-[#111]">Quick Learner</p>
                  <p className="text-[10px] text-[#6A6F73]">Complete 5 courses</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
                <div className="p-2 bg-white rounded shadow-sm"><Star className="w-4 h-4 text-gray-400" /></div>
                <div>
                  <p className="text-xs font-bold text-[#111]">Top Performer</p>
                  <p className="text-[10px] text-[#6A6F73]">Average score 90%+</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
