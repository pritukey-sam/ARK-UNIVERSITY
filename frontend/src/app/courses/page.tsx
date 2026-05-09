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
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
            <Input 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-10 border-[#eee] bg-white"
            />
          </div>
          {user?.role === 'admin' && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger 
                render={
                  <Button className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm transition-all hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Create Course
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>Add a new course to your learning library.</DialogDescription>
                </DialogHeader>
                <CreateCourseForm onCreated={() => { fetchCourses(); setIsCreateOpen(false); }} onCancel={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Modal */}
          {user?.role === 'admin' && editCourse && (
            <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle>Edit Course</DialogTitle>
                  <DialogDescription>Update the details of your course.</DialogDescription>
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
          {filtered.map((course) => (
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
    completion_duration_days: 30,
    category: 'General'
  });

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.description) return toast.error("Please fill required fields");
    
    setSubmitting(true);
    try {
      await api.admin.createCourse(courseForm);
      toast.success("Course created successfully!");
      setCourseForm({ title: '', description: '', thumbnail_url: '', completion_duration_days: 30, category: 'General' });
      onCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
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
    completion_duration_days: course.completion_duration_days !== undefined && course.completion_duration_days !== null ? course.completion_duration_days : 30,
    category: course.category || 'General'
  });

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.description) return toast.error("Please fill required fields");
    
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
    <form onSubmit={handleUpdateCourse} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Course Name <span className="text-red-500">*</span></Label>
        <Input id="edit-title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} placeholder="e.g. Advanced React Patterns" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-desc">Course Description <span className="text-red-500">*</span></Label>
        <Textarea id="edit-desc" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} placeholder="Describe what learners will achieve..." className="min-h-[100px]" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-duration">Completion Duration (Days)</Label>
        <Input id="edit-duration" type="number" value={courseForm.completion_duration_days} onChange={e => setCourseForm({...courseForm, completion_duration_days: parseInt(e.target.value) || 0})} min="1" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-image">Thumbnail URL</Label>
        <Input id="edit-image" value={courseForm.thumbnail_url} onChange={e => setCourseForm({...courseForm, thumbnail_url: e.target.value})} placeholder="https://example.com/image.jpg" />
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-[#F26522] hover:bg-[#D54D10]" disabled={submitting}>
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
