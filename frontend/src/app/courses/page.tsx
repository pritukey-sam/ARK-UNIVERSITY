'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  BookOpen, Plus, Search, BookMarked, Loader2, Trash2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn, formatDuration } from '@/lib/utils';
import Link from 'next/link';
import { validateCourseName, validateDescription, validateNumericRange, validateURL } from '@/lib/validation';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Visual limit display toggles
  const [showAllAssigned, setShowAllAssigned] = useState(false);
  const [showAllAvailable, setShowAllAvailable] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await api.common.getCourses();
      setCourses(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (courseId: number) => {
    try {
      await api.employee.requestAccess(courseId);
      toast.success("Your course access request has been submitted.");
      fetchCourses();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    }
  };

  const filtered = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-[#f8f9fa] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#111]">Courses</h1>
          <p className="text-[#6A6F73] mt-1">Available learning programs.</p>
        </div>
        <div className="flex gap-4 items-center">
          {user?.role === 'admin' && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger 
                render={
                  <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm transition-all hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Create Course
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 md:p-8 [&>button]:rounded-full [&>button]:hover:bg-gray-100 [&>button]:transition-colors">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Create New Course</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1">Add a new course to your learning library.</DialogDescription>
                </DialogHeader>
                <CreateCourseForm onCreated={() => { fetchCourses(); setIsCreateOpen(false); }} onCancel={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Modal */}
          {user?.role === 'admin' && editCourse && (
            <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
              <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 md:p-8 [&>button]:rounded-full [&>button]:hover:bg-gray-100 [&>button]:transition-colors">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Edit Course</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1">Update the details of your course.</DialogDescription>
                </DialogHeader>
                <EditCourseForm course={editCourse} onUpdated={() => { fetchCourses(); setIsEditOpen(false); }} onCancel={() => setIsEditOpen(false)} />
              </DialogContent>
            </Dialog>
          )}

          {/* Delete Modal */}
          {user?.role === 'admin' && courseToDelete && (
            <DeleteCourseModal 
              isOpen={isDeleteOpen} 
              course={courseToDelete} 
              onDeleted={() => { fetchCourses(); setIsDeleteOpen(false); setCourseToDelete(null); }} 
              onCancel={() => { setIsDeleteOpen(false); setCourseToDelete(null); }} 
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-64 bg-white border border-gray-200 shadow-sm rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        user?.role === 'employee' ? (
          <div className="space-y-12 pb-12">
            {/* My Assigned Courses Section */}
            <section id="tour-courses-assigned-section" className="space-y-6">
              <h2 className="text-xl font-bold text-[#111] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#F26522] rounded-full" />
                My Assigned Courses
              </h2>
              {filtered.filter(c => c.is_enrolled).length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                    {filtered.filter(c => c.is_enrolled).slice(0, showAllAssigned ? undefined : 12).map((course, index) => (
                      <div key={course.id} id={index === 0 ? "tour-courses-first-card" : undefined} className="relative group h-full">
                        <Link href={`/courses/${course.id}`} className="block h-full">
                          <Card className="bg-white h-full overflow-hidden flex flex-col border border-gray-200/80 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-gray-300 hover:-translate-y-1 transition-all duration-300">
                            <div className="aspect-video bg-white border-b border-[#eee]">
                              <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold text-[#111] line-clamp-2">{course.title}</h3>
                                <p className="text-xs text-[#6A6F73] mt-1 line-clamp-2">{course.description}</p>
                              </div>
                              <div id={index === 0 ? "tour-courses-card-details" : undefined} className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#6A6F73] uppercase">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> {course.total_modules} Modules
                                </div>
                                <span>{formatDuration(course.total_duration_seconds || 0)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    ))}
                  </div>
                  {filtered.filter(c => c.is_enrolled).length > 12 && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllAssigned(!showAllAssigned)}
                        className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold h-11 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
                      >
                        {showAllAssigned ? "See Less" : "Load More"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-gray-500">No assigned courses yet</p>
                </div>
              )}
            </section>

            {/* Available Courses Section */}
            <section id="tour-courses-available-section" className="space-y-6">
              <h2 className="text-xl font-bold text-[#111] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gray-200 rounded-full" />
                Available Courses
              </h2>
              {filtered.filter(c => !c.is_enrolled).length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                    {filtered.filter(c => !c.is_enrolled).slice(0, showAllAvailable ? undefined : 12).map((course, index) => (
                      <div key={course.id} id={index === 0 ? "tour-courses-first-card" : undefined} className="relative group h-full">
                        <Link href={`/courses/${course.id}`} className="block h-full">
                          <Card className="bg-white h-full overflow-hidden flex flex-col border border-gray-200/80 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-gray-300 hover:-translate-y-1 transition-all duration-300">
                            <div className="aspect-video bg-white border-b border-[#eee]">
                              <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold text-[#111] line-clamp-2">{course.title}</h3>
                                <p className="text-xs text-[#6A6F73] mt-1 line-clamp-2">{course.description}</p>
                              </div>
                              <div>
                                <div id={index === 0 ? "tour-courses-card-details" : undefined} className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#6A6F73] uppercase mb-4">
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" /> {course.total_modules} Modules
                                  </div>
                                  <span>{formatDuration(course.total_duration_seconds || 0)}</span>
                                </div>

                                {(!course.is_enrolled && course.progress?.status !== 'completed') && (
                                  <Button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRequestAccess(course.id);
                                    }}
                                    disabled={course.access_request_status === 'pending' || course.access_request_status === 'approved'}
                                    className={cn(
                                      "w-full text-xs font-bold h-9 rounded-lg transition-all",
                                      course.access_request_status === 'pending' 
                                        ? "bg-amber-500 hover:bg-amber-600 text-white opacity-90"
                                        : course.access_request_status === 'approved'
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white opacity-90"
                                        : "bg-[#F26522] hover:bg-[#D54D10] text-white"
                                    )}
                                  >
                                    {course.access_request_status === 'pending' ? 'Pending Approval' :
                                     course.access_request_status === 'approved' ? 'Approved - Awaiting Assignment' :
                                     'Request Access'}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    ))}
                  </div>
                  {filtered.filter(c => !c.is_enrolled).length > 12 && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllAvailable(!showAllAvailable)}
                        className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold h-11 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
                      >
                        {showAllAvailable ? "See Less" : "Load More"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 bg-white border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-gray-500">No additional courses available</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
              {filtered.slice(0, showAllCourses ? undefined : 12).map((course) => (
                <div key={course.id} className="relative group h-full">
                  <Link href={`/courses/${course.id}`} className="block h-full">
                    <Card className="bg-white h-full overflow-hidden flex flex-col border border-gray-200/80 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-gray-300 hover:-translate-y-1 transition-all duration-300">
                      <div className="aspect-video bg-white border-b border-[#eee]">
                        <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-[#111] line-clamp-2">{course.title}</h3>
                          <p className="text-xs text-[#6A6F73] mt-1 line-clamp-2">{course.description}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#6A6F73] uppercase">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {course.total_modules} Modules
                          </div>
                          <span>{formatDuration(course.total_duration_seconds || 0)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {user?.role === 'admin' && (
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8 bg-white hover:bg-gray-100 text-[#111] shadow-md border border-gray-200 rounded-full" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditCourse(course); setIsEditOpen(true); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white shadow-md border border-red-600 rounded-full" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCourseToDelete(course); setIsDeleteOpen(true); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filtered.length > 12 && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAllCourses(!showAllCourses)}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold h-11 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
                >
                  {showAllCourses ? "See Less" : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="text-center py-20 bg-white border border-[#eee] rounded-xl">
          <BookMarked className="w-12 h-12 text-[#6A6F73] mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-[#111]">No courses found</h3>
        </div>
      )}
    </div>
  );
}

function CreateCourseForm({ onCreated, onCancel }: { onCreated: () => void, onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    completion_duration_days: '30',
    category: 'General'
  });

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleTitleChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, title: val }));
    const check = validateCourseName(val);
    setTitleError(check.isValid ? '' : (check.error || 'Invalid title'));
  };

  const handleDescriptionChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, description: val }));
    const check = validateDescription(val, true);
    setDescriptionError(check.isValid ? '' : (check.error || 'Invalid description'));
  };

  const handleDurationChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, completion_duration_days: val }));
    const check = validateNumericRange(val, 1, 365, 'Duration');
    setDurationError(check.isValid ? '' : (check.error || 'Invalid duration'));
  };

  const handleUrlChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, thumbnail_url: val }));
    const check = validateURL(val, false);
    setUrlError(check.isValid ? '' : (check.error || 'Invalid URL'));
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tCheck = validateCourseName(courseForm.title);
    if (!tCheck.isValid) {
      setTitleError(tCheck.error || "Invalid title");
      return toast.error(tCheck.error || "Invalid title");
    }

    const dCheck = validateDescription(courseForm.description, true);
    if (!dCheck.isValid) {
      setDescriptionError(dCheck.error || "Invalid description");
      return toast.error(dCheck.error || "Invalid description");
    }

    const duCheck = validateNumericRange(courseForm.completion_duration_days, 1, 365, 'Duration');
    if (!duCheck.isValid) {
      setDurationError(duCheck.error || "Invalid duration");
      return toast.error(duCheck.error || "Invalid duration");
    }

    const uCheck = validateURL(courseForm.thumbnail_url, false);
    if (!uCheck.isValid) {
      setUrlError(uCheck.error || "Invalid thumbnail URL");
      return toast.error(uCheck.error || "Invalid thumbnail URL");
    }
    
    setSubmitting(true);
    try {
      await api.admin.createCourse({
        ...courseForm,
        completion_duration_days: parseInt(courseForm.completion_duration_days)
      });
      toast.success("Course created successfully!");
      setCourseForm({ title: '', description: '', thumbnail_url: '', completion_duration_days: '30', category: 'General' });
      onCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCreateCourse} className="space-y-5 pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Course Name <span className="text-red-500">*</span></Label>
        <Input 
          id="title" 
          value={courseForm.title} 
          onChange={e => handleTitleChange(e.target.value)} 
          onBlur={e => handleTitleChange(e.target.value)}
          placeholder="e.g. Advanced React Patterns" 
          className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", titleError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
          required 
        />
        {titleError && (
          <p className="text-red-500 text-xs font-bold">{titleError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="desc" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Course Description <span className="text-red-500">*</span></Label>
        <Textarea 
          id="desc" 
          value={courseForm.description} 
          onChange={e => handleDescriptionChange(e.target.value)} 
          onBlur={e => handleDescriptionChange(e.target.value)}
          placeholder="Describe what learners will achieve..." 
          className={cn("min-h-[100px] rounded-xl border-gray-200 p-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200 resize-none", descriptionError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
          required 
        />
        {descriptionError && (
          <p className="text-red-500 text-xs font-bold">{descriptionError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="duration" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Duration (Days)</Label>
        <Input 
          id="duration" 
          type="text" 
          value={courseForm.completion_duration_days} 
          onChange={e => handleDurationChange(e.target.value)} 
          onBlur={e => handleDurationChange(e.target.value)}
          className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", durationError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
        />
        {durationError && (
          <p className="text-red-500 text-xs font-bold">{durationError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="image" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thumbnail URL</Label>
        <Input 
          id="image" 
          value={courseForm.thumbnail_url} 
          onChange={e => handleUrlChange(e.target.value)} 
          onBlur={e => handleUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg" 
          className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", urlError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
        />
        {urlError && (
          <p className="text-red-500 text-xs font-bold">{urlError}</p>
        )}
      </div>
      <DialogFooter className="pt-4 flex flex-row gap-3 sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-xl px-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all">Cancel</Button>
        <Button type="submit" className="h-11 rounded-xl px-6 font-bold bg-[#F26522] hover:bg-[#D54D10] text-white shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200/50 active:scale-95 transition-all" disabled={submitting || !!titleError || !!descriptionError || !!durationError || !!urlError}>
          {submitting ? "Creating..." : "Create Course"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditCourseForm({ course, onUpdated, onCancel }: { course: any, onUpdated: () => void, onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: course.title || '',
    description: course.description || '',
    thumbnail_url: course.thumbnail_url || '',
    completion_duration_days: course.completion_duration_days !== undefined && course.completion_duration_days !== null ? String(course.completion_duration_days) : '30',
    category: course.category || 'General'
  });

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleTitleChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, title: val }));
    const check = validateCourseName(val);
    setTitleError(check.isValid ? '' : (check.error || 'Invalid title'));
  };

  const handleDescriptionChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, description: val }));
    const check = validateDescription(val, true);
    setDescriptionError(check.isValid ? '' : (check.error || 'Invalid description'));
  };

  const handleDurationChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, completion_duration_days: val }));
    const check = validateNumericRange(val, 1, 365, 'Duration');
    setDurationError(check.isValid ? '' : (check.error || 'Invalid duration'));
  };

  const handleUrlChange = (val: string) => {
    setCourseForm(prev => ({ ...prev, thumbnail_url: val }));
    const check = validateURL(val, false);
    setUrlError(check.isValid ? '' : (check.error || 'Invalid URL'));
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tCheck = validateCourseName(courseForm.title);
    if (!tCheck.isValid) {
      setTitleError(tCheck.error || "Invalid title");
      return toast.error(tCheck.error || "Invalid title");
    }

    const dCheck = validateDescription(courseForm.description, true);
    if (!dCheck.isValid) {
      setDescriptionError(dCheck.error || "Invalid description");
      return toast.error(dCheck.error || "Invalid description");
    }

    const duCheck = validateNumericRange(courseForm.completion_duration_days, 1, 365, 'Duration');
    if (!duCheck.isValid) {
      setDurationError(duCheck.error || "Invalid duration");
      return toast.error(duCheck.error || "Invalid duration");
    }

    const uCheck = validateURL(courseForm.thumbnail_url, false);
    if (!uCheck.isValid) {
      setUrlError(uCheck.error || "Invalid thumbnail URL");
      return toast.error(uCheck.error || "Invalid thumbnail URL");
    }
    
    setSubmitting(true);
    try {
      await api.admin.updateCourse(course.id, {
        ...courseForm,
        completion_duration_days: parseInt(courseForm.completion_duration_days)
      });
      toast.success("Course updated successfully!");
      onUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleUpdateCourse} className="space-y-5 pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="edit-title" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Course Name <span className="text-red-500">*</span></Label>
        <Input 
          id="edit-title" 
          value={courseForm.title} 
          onChange={e => handleTitleChange(e.target.value)} 
          onBlur={e => handleTitleChange(e.target.value)}
          placeholder="e.g. Advanced React Patterns" 
          className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", titleError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
          required 
        />
        {titleError && (
          <p className="text-red-500 text-xs font-bold">{titleError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-desc" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Course Description <span className="text-red-500">*</span></Label>
        <Textarea 
          id="edit-desc" 
          value={courseForm.description} 
          onChange={e => handleDescriptionChange(e.target.value)} 
          onBlur={e => handleDescriptionChange(e.target.value)}
          placeholder="Describe what learners will achieve..." 
          className={cn("min-h-[100px] rounded-xl border-gray-200 p-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200 resize-none", descriptionError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
          required 
        />
        {descriptionError && (
          <p className="text-red-500 text-xs font-bold">{descriptionError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-duration" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Duration (Days)</Label>
        <Input 
          id="edit-duration" 
          type="text" 
          value={courseForm.completion_duration_days} 
          onChange={e => handleDurationChange(e.target.value)} 
          onBlur={e => handleDurationChange(e.target.value)}
          className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", durationError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
        />
        {durationError && (
          <p className="text-red-500 text-xs font-bold">{durationError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-image" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thumbnail URL</Label>
        <Input 
          id="edit-image" 
          value={courseForm.thumbnail_url} 
          onChange={e => handleUrlChange(e.target.value)} 
          onBlur={e => handleUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg" 
          className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", urlError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
        />
        {urlError && (
          <p className="text-red-500 text-xs font-bold">{urlError}</p>
        )}
      </div>
      <DialogFooter className="pt-4 flex flex-row gap-3 sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-xl px-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all">Cancel</Button>
        <Button type="submit" className="h-11 rounded-xl px-6 font-bold bg-[#F26522] hover:bg-[#D54D10] text-white shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200/50 active:scale-95 transition-all" disabled={submitting || !!titleError || !!descriptionError || !!durationError || !!urlError}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteCourseModal({ course, onDeleted, onCancel, isOpen }: { course: any, onDeleted: () => void, onCancel: () => void, isOpen: boolean }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.admin.deleteCourse(course.id);
      toast.success("Course deleted successfully");
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Delete Course
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{course?.title}</strong>? This action cannot be undone and will remove all associated modules and progress.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
