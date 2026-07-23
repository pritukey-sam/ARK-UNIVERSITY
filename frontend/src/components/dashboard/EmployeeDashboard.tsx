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
  const [modulesMap, setModulesMap] = useState<Record<number, string>>({});
  const [activityPage, setActivityPage] = useState(1);
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

      // Fetch modules for all assigned courses to build the ID-to-title map
      const maps: Record<number, string> = {};
      await Promise.all(coursesData.map(async (course: any) => {
        try {
          const courseModules = await api.common.getModulesByCourse(course.id);
          courseModules.forEach((m: any) => {
            maps[m.id] = m.title;
          });
        } catch (err) {
          console.error(`Failed to load modules for course ${course.id}`, err);
        }
      }));
      setModulesMap(maps);
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

  // Filter, format, and deduplicate activity feed for personal "My Learning Activity" timeline
  const processedActivities = React.useMemo(() => {
    if (!activity || activity.length === 0) return [];

    // 1. Filter only logs related to current user
    const personalActivity = activity.filter(item => {
      if (!item.message) return false;
      const prefix = `${user?.name}:`;
      const prefixAlt = `${user?.name} `;
      return item.message.startsWith(prefix) || item.message.startsWith(prefixAlt);
    });

    // 2. Format logs and replace module IDs with actual module titles
    const formattedActivities = personalActivity.map(item => {
      let rawMessage = item.message;
      const prefix = `${user?.name}:`;
      const prefixAlt = `${user?.name} `;
      let details = rawMessage;
      
      // Strip user name prefix to make it feel like "My Learning Activity"
      if (rawMessage.startsWith(prefix)) {
        details = rawMessage.slice(prefix.length).trim();
      } else if (rawMessage.startsWith(prefixAlt)) {
        details = rawMessage.slice(prefixAlt.length).trim();
      }

      // Find occurrences of module ID and replace with titles
      const regex = /module ID:\s*(\d+)/i;
      const match = details.match(regex);
      if (match) {
        const moduleId = parseInt(match[1]);
        const moduleName = modulesMap[moduleId] || `Module #${moduleId}`;
        
        if (details.includes('Watched all videos')) {
          details = `Completed all videos in “${moduleName}”`;
        } else if (details.includes('Successfully finished all requirements')) {
          details = `Successfully finished all requirements for “${moduleName}”`;
        } else if (details.includes('Uploaded assignment')) {
          details = `Uploaded assignment for “${moduleName}”`;
        } else if (details.includes('Uploaded solution')) {
          details = `Uploaded solution for “${moduleName}”`;
        } else if (details.includes('Completed reading material')) {
          details = `Completed reading material in “${moduleName}”`;
        } else {
          details = details.replace(/module ID:\s*\d+/i, `“${moduleName}”`);
        }
      }

      return {
        ...item,
        formattedMessage: details
      };
    });

    // 3. Deduplicate matching logs to keep ONLY the latest entry
    const uniqueActivities: any[] = [];
    const seenMessages = new Set<string>();
    formattedActivities.forEach(item => {
      if (!seenMessages.has(item.formattedMessage)) {
        seenMessages.add(item.formattedMessage);
        uniqueActivities.push(item);
      }
    });

    return uniqueActivities;
  }, [activity, modulesMap, user]);

  const totalActivities = processedActivities.length;
  const activitiesPerPage = 5;
  const totalPages = Math.ceil(totalActivities / activitiesPerPage);
  const startIndex = (activityPage - 1) * activitiesPerPage;
  const currentActivities = processedActivities.slice(startIndex, startIndex + activitiesPerPage);

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
      <div id="tour-dashboard-overview" className="bg-white p-8 rounded-xl border border-[#eee] shadow-sm">
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
        <div id="tour-dashboard-assigned-courses" className="lg:col-span-2 space-y-6">
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
              {courses.map((course, index) => {
                const progress = course.status === 'completed' ? 100 : 
                  course.total_modules > 0 ? Math.round((course.completed_modules / course.total_modules) * 100) : 0;
                
                return (
                  <Link key={course.id} href={`/courses/${course.id}`}>
                    <Card className="group overflow-hidden border border-[#eee] bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                      {/* Course Image / Banner */}
                      <div className="relative h-44 w-full overflow-hidden">
                        {course.thumbnail_url ? (
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#F26522]/20 to-[#F26522]/5 flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-[#F26522]/40" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge className={cn(
                            "shadow-sm border-none text-[10px] font-bold uppercase px-2.5 py-1",
                            course.status === 'completed' ? "bg-green-500 text-white" : "bg-blue-600 text-white"
                          )}>
                            {course.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-5 flex-1 flex flex-col">
                        <div className="mb-auto">
                          <h3 className="font-bold text-[#111] text-lg leading-tight line-clamp-2 group-hover:text-[#F26522] transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-sm text-[#6A6F73] mt-2 line-clamp-2 font-medium">
                            {course.description || "Start your learning journey with this comprehensive curriculum."}
                          </p>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="space-y-2" id={index === 0 ? "tour-course-progress" : undefined}>
                            <div className="flex justify-between items-end">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6A6F73] uppercase tracking-wider">Course Progress</p>
                                <p className="text-xs font-bold text-[#111]">
                                  {course.completed_modules} / {course.total_modules} Modules Completed
                                </p>
                              </div>
                              <span className="text-sm font-bold text-[#F26522]">{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000 ease-out", 
                                  course.status === 'completed' ? "bg-green-500" : "bg-[#F26522]"
                                )} 
                                style={{ width: `${progress}%` }} 
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button 
                              className="w-full bg-white border border-[#eee] text-[#111] hover:bg-[#F26522] hover:text-white hover:border-[#F26522] font-bold text-sm h-10 shadow-none transition-all group-hover:shadow-md"
                            >
                              {course.status === 'completed' ? 'Review Course' : 'Continue Learning'}
                              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
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
          <Card id="tour-dashboard-recent-activity" className="p-6 bg-white border border-[#eee] shadow-sm">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Activity className="w-5 h-5 text-[#F26522]" />
            </CardHeader>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {currentActivities.length > 0 ? currentActivities.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-[#eee] rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="mt-1">
                    {item.type === 'quiz_attempt' ? <Trophy className="w-4 h-4 text-orange-500" /> : 
                     item.type === 'submission' ? <Plus className="w-4 h-4 text-purple-500" /> :
                     <BookOpen className="w-4 h-4 text-green-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111]">{item.formattedMessage}</p>
                    <p className="text-xs text-[#6A6F73] mt-1">{formatDate(item.time)}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-[#6A6F73] text-sm">No recent activity</div>
              )}
            </div>
            {totalActivities > activitiesPerPage && (
              <div className="flex items-center justify-between pt-4 border-t border-[#eee] mt-4">
                {activityPage > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                    className="text-xs font-bold text-[#6A6F73] hover:text-[#F26522] hover:bg-orange-50"
                  >
                    ← Previous
                  </Button>
                ) : (
                  <div className="w-[80px]" />
                )}
                
                <span className="text-xs text-[#6A6F73] font-bold">
                  Page {activityPage} of {totalPages}
                </span>

                {activityPage < totalPages ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivityPage(prev => Math.min(totalPages, prev + 1))}
                    className="text-xs font-bold text-[#6A6F73] hover:text-[#F26522] hover:bg-orange-50"
                  >
                    Next →
                  </Button>
                ) : (
                  <div className="w-[80px]" />
                )}
              </div>
            )}
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
