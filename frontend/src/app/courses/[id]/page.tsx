'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import BackNavigation from '@/components/common/BackNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus, Trash2, ArrowRight, Clock, Layers, ChevronRight, Edit2,
  Loader2, Lock, CheckCircle2, PlayCircle, BookOpen, Trophy,
  FileText, Calendar, BarChart2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { validateCourseName, validateDescription, validateNumericRange, validateURL } from '@/lib/validation';

export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModule, setEditModule] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [progressData, setProgressData] = useState<Record<number, any>>({});
  const [isCourseEditOpen, setIsCourseEditOpen] = useState(false);
  const [isCourseDeleteOpen, setIsCourseDeleteOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isEmployee = currentUser?.role === 'employee';

  useEffect(() => { fetchData(); }, [id, currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.common.getCourse(parseInt(id));
      setCourse(data);

      if (currentUser?.role === 'employee' && data.modules?.length > 0) {
        const progressPromises = data.modules.map((m: any) =>
          api.employee.getModuleProgressDetail(parseInt(id), m.id)
            .catch(() => ({ module_id: m.id }))
        );
        const progressResults = await Promise.all(progressPromises);
        const progressMap: Record<number, any> = {};
        progressResults.forEach(p => {
          if (p?.module_id) progressMap[p.module_id] = p;
        });
        setProgressData(progressMap);
      }
    } catch (error) {
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="w-8 h-8 text-[#F26522] animate-spin" />
    </div>
  );

  if (!course) return null;

  const totalDuration = course.modules?.reduce((acc: number, m: any) => acc + (m.duration_seconds || 0), 0) || 0;
  const totalCount = course.modules?.length || 0;

  // Dynamic Progress calculations
  let courseTotalItems = 0;
  let courseCompletedItems = 0;

  const modulesProgress = course.modules?.map((m: any) => {
    const currProg = progressData[m.id] || {};
    const totalVideos = m.video_count || 0;
    const completedVideos = currProg?.videos?.filter((v: any) => v?.is_completed)?.length || 0;

    const hasNotes = m.note_count > 0;
    const notesDone = !hasNotes || currProg?.notes_completed === true;

    const hasAssignment = m.assignment_count > 0;
    const assignmentDone = !hasAssignment || currProg?.assignment_completed === true;

    const hasQuiz = m.quiz_count > 0;
    const quizDone = !hasQuiz || currProg?.quiz_completed === true;

    // Items for this module
    const totalItems = totalVideos + (hasNotes ? 1 : 0) + (hasAssignment ? 1 : 0) + (hasQuiz ? 1 : 0);
    const completedItems = completedVideos + (hasNotes && notesDone ? 1 : 0) + (hasAssignment && assignmentDone ? 1 : 0) + (hasQuiz && quizDone ? 1 : 0);

    courseTotalItems += totalItems;
    courseCompletedItems += completedItems;

    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const isCompleted = m.is_completed || currProg?.is_completed === true || (totalItems > 0 && completedItems === totalItems);

    return {
      id: m.id,
      pct,
      isCompleted
    };
  }) || [];

  const progressPct = courseTotalItems > 0 ? Math.round((courseCompletedItems / courseTotalItems) * 100) : 0;
  const completedCount = modulesProgress.filter((mp: any) => mp.isCompleted).length || 0;

  // Determine which module to resume (first non-completed)
  const resumeModule = course.modules?.find((m: any, idx: number) => {
    const mp = modulesProgress[idx];
    return mp ? !mp.isCompleted : !m.is_completed;
  }) || course.modules?.[0];

  // Module lock logic: module[i] is locked if module[i-1] is not completed
  const isModuleLocked = (index: number) => {
    if (index === 0) return false;
    const prevModProgress = modulesProgress[index - 1];
    return prevModProgress ? !prevModProgress.isCompleted : !course.modules[index - 1]?.is_completed;
  };

  const handleModuleClick = (module: any, index: number) => {
    if (isModuleLocked(index)) {
      toast.error('Complete the previous module to unlock this one');
      return;
    }
    router.push(`/courses/${id}/modules/${module.id}`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── HERO BANNER ── */}
      <div id="tour-course-details-hero" className="bg-white border-b border-[#eee]">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {/* Back Navigation */}
          <BackNavigation />

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Info */}
            <div className="flex-1 space-y-5">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#111] leading-tight">{course.title}</h1>
                {course.description && (
                  <p className="text-[#6A6F73] leading-relaxed max-w-2xl text-sm">{course.description}</p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6A6F73] uppercase tracking-wide font-semibold">Modules</p>
                    <p className="text-sm font-bold text-[#111]">{totalCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6A6F73] uppercase tracking-wide font-semibold">Duration</p>
                    <p className="text-sm font-bold text-[#111]">{course.completion_duration_days || 30} Days</p>
                  </div>
                </div>
                {isEmployee && completedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                      <BarChart2 className="w-4 h-4 text-[#F26522]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6A6F73] uppercase tracking-wide font-semibold">Progress</p>
                      <p className="text-sm font-bold text-[#111]">{completedCount}/{totalCount} done</p>
                    </div>
                  </div>
                )}
                {course.due_date && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6A6F73] uppercase tracking-wide font-semibold">Due Date</p>
                      <p className="text-sm font-bold text-[#111]">
                        {new Date(course.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar (employee only) */}
              {isEmployee && totalCount > 0 && (
                <div className="space-y-1.5 max-w-md">
                  <div className="flex justify-between text-xs font-semibold text-[#6A6F73]">
                    <span>Overall Progress</span>
                    <span className="text-[#F26522]">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F26522] rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex gap-3 pt-1">
                {currentUser?.role === 'employee' ? (
                  <Button
                    className="bg-[#F26522] hover:bg-[#D54D10] text-white h-11 px-6 font-semibold"
                    onClick={() => router.push(resumeModule ? `/courses/${id}/modules/${resumeModule.id}` : `#`)}
                    disabled={!resumeModule}
                  >
                    {progressPct === 0 ? 'Start Learning' : progressPct === 100 ? 'Review Course' : 'Continue Learning'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Right: Thumbnail */}
            <div className="lg:w-[340px] shrink-0 space-y-3">
              <div className="aspect-video rounded-xl overflow-hidden border border-[#eee] shadow-sm">
                <img
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Edit and Delete Course Buttons — visible only to admin */}
              {isAdmin && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 rounded-lg active:scale-95 transition-all"
                    onClick={() => setIsCourseEditOpen(true)}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Course
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1.5 rounded-lg active:scale-95 transition-all"
                    onClick={() => setIsCourseDeleteOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Course
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODULE LIST ── */}
      <div id="tour-course-curriculum" className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111]">Course Curriculum</h2>
          {isAdmin && <CreateModuleDialog courseId={id} onCreated={fetchData} />}
        </div>

        {totalCount === 0 ? (
          <div className="text-center py-20 bg-white border border-[#eee] rounded-xl">
            <Layers className="w-12 h-12 text-[#6A6F73] mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-[#111]">No modules yet</h3>
            <p className="text-[#6A6F73] text-sm mt-1">This course doesn't have any modules.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {course.modules.map((module: any, index: number) => {
              const locked = isEmployee && isModuleLocked(index);
              const moduleProg = modulesProgress[index];
              const completed = moduleProg ? moduleProg.isCompleted : module.is_completed;
              const isCurrent = isEmployee && !completed && !locked;

              return (
                <div key={module.id} id={index === 0 ? "tour-course-first-module" : undefined}>
                  {/* ── EMPLOYEE MODULE CARD ── */}
                  {isEmployee ? (
                    <button
                      onClick={() => handleModuleClick(module, index)}
                      disabled={locked}
                      className={cn(
                        'w-full text-left bg-white border rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-200',
                        locked
                          ? 'border-[#eee] opacity-60 cursor-not-allowed'
                          : completed
                          ? 'border-green-200 hover:border-green-300 hover:shadow-sm cursor-pointer'
                          : isCurrent
                          ? 'border-[#F26522]/40 shadow-sm hover:shadow-md cursor-pointer ring-1 ring-[#F26522]/10'
                          : 'border-[#eee] hover:border-gray-300 hover:shadow-sm cursor-pointer'
                      )}
                    >
                      {/* Status icon */}
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm',
                        locked ? 'bg-gray-100 text-gray-400'
                          : completed ? 'bg-green-50 text-green-600'
                          : isCurrent ? 'bg-[#F26522] text-white'
                          : 'bg-gray-100 text-[#6A6F73]'
                      )}>
                        {locked ? (
                          <Lock className="w-4 h-4" />
                        ) : completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span>{(index + 1).toString().padStart(2, '0')}</span>
                        )}
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-semibold text-sm truncate',
                          locked ? 'text-[#6A6F73]' : 'text-[#111]'
                        )}>
                          Module {index + 1} — {module.title}
                        </p>
                        <p className="text-xs text-[#6A6F73] mt-0.5 flex items-center gap-3">
                          {module.duration_seconds > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(module.duration_seconds)}
                            </span>
                          )}
                          {module.video_count > 0 && (
                            <span className="flex items-center gap-1">
                              <PlayCircle className="w-3 h-3" />
                              {module.video_count} video{module.video_count !== 1 ? 's' : ''}
                            </span>
                          )}
                          {module.quiz_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              Quiz
                            </span>
                          )}
                          {module.note_count > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Notes
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Right badge */}
                      <div className="shrink-0">
                        {locked ? (
                          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">Locked</Badge>
                        ) : completed ? (
                          <Badge className="text-[10px] bg-green-50 text-green-700 border-green-200 border">Completed</Badge>
                        ) : isCurrent ? (
                          <Badge className="text-[10px] bg-orange-50 text-[#F26522] border-orange-200 border">Current ({moduleProg?.pct}%)</Badge>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    </button>
                  ) : (
                    /* ── ADMIN MODULE CARD ── */
                    <Card className="bg-white border-[#eee] shadow-sm hover:shadow-md transition-all overflow-hidden group">
                      <CardContent className="p-0">
                        <div
                          className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => router.push(`/courses/${id}/modules/${module.id}/preview`)}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 bg-white text-[#6A6F73] border border-[#eee]">
                              {(index + 1).toString().padStart(2, '0')}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[#111] truncate">{module.title}</h3>
                              <p className="text-xs text-[#6A6F73] mt-0.5">
                                {formatDuration(module.duration_seconds || 0)}
                                {module.video_count > 0 && ` · ${module.video_count} videos`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-white hover:bg-gray-100 text-[#111] shadow-sm border border-gray-200 rounded-full"
                                onClick={(e) => { e.stopPropagation(); setEditModule(module); setIsEditOpen(true); }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white shadow-sm border border-red-600 rounded-full"
                                onClick={(e) => { e.stopPropagation(); setModuleToDelete(module); setIsDeleteOpen(true); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#6A6F73]" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin dialogs — untouched */}
      {isAdmin && editModule && (
        <EditModuleDialog
          module={editModule}
          courseId={id}
          isOpen={isEditOpen}
          onUpdated={() => { fetchData(); setIsEditOpen(false); setEditModule(null); }}
          onCancel={() => { setIsEditOpen(false); setEditModule(null); }}
        />
      )}
      {isAdmin && moduleToDelete && (
        <DeleteModuleDialog
          module={moduleToDelete}
          isOpen={isDeleteOpen}
          onDeleted={() => { fetchData(); setIsDeleteOpen(false); setModuleToDelete(null); }}
          onCancel={() => { setIsDeleteOpen(false); setModuleToDelete(null); }}
        />
      )}
      {/* Course Admin dialogs */}
      {isAdmin && (
        <>
          <EditCourseDialog
            course={course}
            isOpen={isCourseEditOpen}
            onUpdated={() => { fetchData(); setIsCourseEditOpen(false); }}
            onCancel={() => setIsCourseEditOpen(false)}
          />
          <DeleteCourseDialog
            course={course}
            isOpen={isCourseDeleteOpen}
            onDeleted={() => {
              setIsCourseDeleteOpen(false);
              router.push('/courses');
            }}
            onCancel={() => setIsCourseDeleteOpen(false)}
          />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  ADMIN DIALOGS — unchanged from original               */
/* ─────────────────────────────────────────────────────── */

function CreateModuleDialog({ courseId, onCreated }: { courseId: string, onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', duration_seconds: 3600 });
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (!open) {
      setTitleError('');
    }
  }, [open]);

  const handleTitleChange = (val: string) => {
    setFormData(prev => ({ ...prev, title: val }));
    const check = validateCourseName(val);
    setTitleError(check.isValid ? '' : (check.error || 'Invalid title'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tCheck = validateCourseName(formData.title);
    if (!tCheck.isValid) {
      setTitleError(tCheck.error || "Invalid title");
      return toast.error(tCheck.error || "Invalid title");
    }

    setLoading(true);
    try {
      await api.admin.createModule(parseInt(courseId), { ...formData, order: 0 });
      toast.success('Module created');
      setOpen(false);
      onCreated();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Module
        </Button>
      } />
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Add New Module</DialogTitle>
          <p className="text-[#6A6F73] text-sm pt-1">Create a new learning module for this course.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Module Title</Label>
            <Input 
              value={formData.title} 
              onChange={e => handleTitleChange(e.target.value)} 
              onBlur={e => handleTitleChange(e.target.value)}
              className={cn("border-[#eee]", titleError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
              placeholder="e.g. Getting Started" 
              required 
            />
            {titleError && (
              <p className="text-red-500 text-xs font-bold">{titleError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !!titleError} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Creating...' : 'Create Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditModuleDialog({ module, courseId, onUpdated, onCancel, isOpen }: { module: any, courseId: string, onUpdated: () => void, onCancel: () => void, isOpen: boolean }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: module?.title || '', description: module?.description || '' });
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (module) setFormData({ title: module.title || '', description: module.description || '' });
    setTitleError('');
  }, [module, isOpen]);

  const handleTitleChange = (val: string) => {
    setFormData(prev => ({ ...prev, title: val }));
    const check = validateCourseName(val);
    setTitleError(check.isValid ? '' : (check.error || 'Invalid title'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tCheck = validateCourseName(formData.title);
    if (!tCheck.isValid) {
      setTitleError(tCheck.error || "Invalid title");
      return toast.error(tCheck.error || "Invalid title");
    }

    setLoading(true);
    try {
      await api.admin.updateModule(module.id, { ...formData, course_id: parseInt(courseId), order: module.order || 0 });
      toast.success('Module updated');
      onUpdated();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-white">
        <DialogHeader><DialogTitle>Edit Module</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Module Title</Label>
            <Input 
              value={formData.title} 
              onChange={e => handleTitleChange(e.target.value)} 
              onBlur={e => handleTitleChange(e.target.value)}
              className={cn("border-[#eee]", titleError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
              required 
            />
            {titleError && (
              <p className="text-red-500 text-xs font-bold">{titleError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !!titleError} className="bg-[#F26522] hover:bg-[#D54D10] text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteModuleDialog({ module, onDeleted, onCancel, isOpen }: { module: any, onDeleted: () => void, onCancel: () => void, isOpen: boolean }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.admin.deleteModule(module.id);
      toast.success('Module deleted');
      onDeleted();
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Delete Module
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-[#6A6F73]">
            Are you sure you want to delete <strong>{module?.title}</strong>? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCourseDialog({ course, onUpdated, onCancel, isOpen }: { course: any, onUpdated: () => void, onCancel: () => void, isOpen: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: course.title || '',
    description: course.description || '',
    thumbnail_url: course.thumbnail_url || '',
    completion_duration_days: course.completion_duration_days !== undefined && course.completion_duration_days !== null ? course.completion_duration_days : 30,
    category: course.category || 'General'
  });

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    if (course) {
      setCourseForm({
        title: course.title || '',
        description: course.description || '',
        thumbnail_url: course.thumbnail_url || '',
        completion_duration_days: course.completion_duration_days !== undefined && course.completion_duration_days !== null ? course.completion_duration_days : 30,
        category: course.category || 'General'
      });
    }
    setTitleError('');
    setDescriptionError('');
    setDurationError('');
    setUrlError('');
  }, [course, isOpen]);

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
    const parsed = parseInt(val) || 0;
    setCourseForm(prev => ({ ...prev, completion_duration_days: parsed }));
    const check = validateNumericRange(parsed, 1, 365, 'Duration');
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
      await api.admin.updateCourse(course.id, courseForm);
      toast.success("Course updated successfully!");
      onUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 md:p-8 [&>button]:rounded-full [&>button]:hover:bg-gray-100 [&>button]:transition-colors">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Edit Course</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">Update the details of your course.</p>
        </DialogHeader>
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
              type="number" 
              value={courseForm.completion_duration_days} 
              onChange={e => handleDurationChange(e.target.value)} 
              onBlur={e => handleDurationChange(e.target.value)}
              className={cn("h-11 rounded-xl border-gray-200 px-4 focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200", durationError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
              min="1" 
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
            <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-xl px-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all" disabled={submitting}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl px-6 font-bold bg-[#F26522] hover:bg-[#D54D10] text-white shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200/50 active:scale-95 transition-all" disabled={submitting || !!titleError || !!descriptionError || !!durationError || !!urlError}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCourseDialog({ course, onDeleted, onCancel, isOpen }: { course: any, onDeleted: () => void, onCancel: () => void, isOpen: boolean }) {
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
      <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 md:p-8 [&>button]:rounded-full [&>button]:hover:bg-gray-100 [&>button]:transition-colors">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2 font-bold text-xl">
            <Trash2 className="w-5 h-5" /> Delete Course
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-2">
            Are you sure you want to delete <strong>{course?.title}</strong>? This action cannot be undone and will remove all associated modules and progress.
          </p>
        </DialogHeader>
        <DialogFooter className="pt-4 flex gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
