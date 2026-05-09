'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
 Plus, PlayCircle, Trophy, 
 Trash2, ArrowRight, Clock, Layers, ChevronDown, ChevronRight, Edit2,
 Video, FileSearch, Loader2
} from 'lucide-react';
import { 
 Dialog, DialogContent, DialogHeader, 
 DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatDuration } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';

export default function CourseRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = use(params);
 const { user: currentUser } = useAuth();
 const router = useRouter();
 const [course, setCourse] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [enrolling, setEnrolling] = useState(false);
 const [editModule, setEditModule] = useState<any>(null);
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [moduleToDelete, setModuleToDelete] = useState<any>(null);
 const [isDeleteOpen, setIsDeleteOpen] = useState(false);
 const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

 useEffect(() => { fetchData(); }, [id]);

 const fetchData = async () => {
 try {
 setLoading(true);
 const data = await api.common.getCourse(parseInt(id));
 setCourse(data);
 } catch (error) {
 console.error(error);
 toast.error('Failed to load course details');
 } finally {
 setLoading(false);
 }
 };



 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen bg-white">
 <div className="w-8 h-8 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 if (!course) return null;

 const totalDuration = course.modules?.reduce((acc: number, m: any) => acc + (m.duration_seconds || 0), 0) || 0;

 return (
 <div className="p-8 space-y-8 bg-white min-h-screen">
 
 {/* Breadcrumb */}
 <nav className="flex items-center gap-2 text-sm text-[#6A6F73]">
 <Link href="/courses" className="hover:text-[#F26522] transition-colors">Courses</Link>
 <ChevronRight className="w-4 h-4" />
 <span className="text-[#111] font-medium">{course.title}</span>
 </nav>

 {/* Hero Section */}
 <div className="bg-white p-8 rounded-xl border border-[#eee] shadow-sm">
 <div className="flex flex-col lg:flex-row gap-8">
 {/* Left: Course Info */}
 <div className="flex-1 space-y-6">
 <div className="space-y-3">
 <h1 className="text-3xl font-bold text-[#111]">{course.title}</h1>
 <p className="text-[#6A6F73] leading-relaxed max-w-2xl">{course.description}</p>
 </div>

 <div className="flex flex-wrap items-center gap-6">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-blue-50 rounded-lg">
 <Layers className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <p className="text-xs text-[#6A6F73]">Modules</p>
 <p className="text-sm font-bold text-[#111]">{course.modules?.length || 0} Units</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="p-2 bg-green-50 rounded-lg">
 <Clock className="w-5 h-5 text-green-600" />
 </div>
 <div>
 <p className="text-xs text-[#6A6F73]">Duration</p>
 <p className="text-sm font-bold text-[#111]">{formatDuration(totalDuration)}</p>
 </div>
 </div>
 </div>

 <div className="flex gap-4">
 <Button 
 className="bg-[#F26522] hover:bg-[#D54D10] text-white"
 onClick={() => {
 if (course.modules?.length > 0) {
 router.push(`/courses/${id}/modules/${course.modules[0].id}`);
 }
 }}
 >
 Start Learning <ArrowRight className="w-4 h-4 ml-2" />
 </Button>
 </div>
 </div>

 {/* Right: Thumbnail */}
 <div className="lg:w-[380px]">
 <div className="aspect-video rounded-xl overflow-hidden border border-[#eee]">
 <img 
 src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'} 
 alt={course.title} 
 className="w-full h-full object-cover"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Modules Section */}
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-xl font-bold text-[#111]">Course Modules</h2>
 {isAdmin && (
 <CreateModuleDialog courseId={id} onCreated={fetchData} />
 )}
 </div>

 {course.modules?.length === 0 ? (
 <div className="text-center py-20 bg-white border border-[#eee] rounded-xl shadow-sm">
 <Layers className="w-12 h-12 text-[#6A6F73] mx-auto mb-4 opacity-20" />
 <h3 className="text-xl font-bold text-[#111]">No modules yet</h3>
 <p className="text-[#6A6F73] mt-1">This course doesn't have any modules.</p>
 </div>
 ) : course.modules.map((module: any, index: number) => (
 <Card key={module.id} className="bg-white border-[#eee] shadow-sm hover:shadow-md transition-all overflow-hidden group">
 <CardContent className="p-0">
 <div 
 className="p-6 flex items-center justify-between gap-6 cursor-pointer hover:bg-gray-50 transition-colors"
 onClick={() => router.push(isAdmin ? `/courses/${id}/modules/${module.id}/manage` : `/courses/${id}/modules/${module.id}`)}
 >
 <div className="flex items-center gap-4 flex-1">
 <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 bg-white text-[#6A6F73] border border-[#eee]">
 {(index + 1).toString().padStart(2, '0')}
 </div>
 <div>
 <h3 className="font-bold text-[#111]">{module.title}</h3>
 <p className="text-sm text-[#6A6F73] line-clamp-1">{module.description || 'No description available.'}</p>
 </div>
 </div>
 
 <div className="flex items-center gap-4">
 <Badge variant="outline" className="border-[#eee] text-[#6A6F73] text-xs">
 {formatDuration(module.duration_seconds || 0)}
 </Badge>
 <div className="flex gap-1 mr-2">
 {module.video_url && <Video className="w-4 h-4 text-blue-500" />}
 {module.quiz_questions_count > 0 && <FileSearch className="w-4 h-4 text-green-500" />}
 </div>
 {isAdmin && (
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
 )}
 <ChevronRight className="w-5 h-5 text-[#6A6F73] ml-2" />
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 {isAdmin && editModule && (
 <EditModuleDialog 
 module={editModule} 
 courseId={id as string} 
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
 </div>
 );
}

function CreateModuleDialog({ courseId, onCreated }: { courseId: string, onCreated: () => void }) {
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({ title: '', description: '', duration_seconds: 3600 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 await api.admin.createModule({
 ...formData,
 course_id: parseInt(courseId),
 order: 0
 });
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
 onChange={e => setFormData({...formData, title: e.target.value})} 
 className="border-[#eee]" 
 placeholder="e.g. Getting Started" 
 />
 </div>
 <div className="space-y-2">
 <Label>Description</Label>
 <Textarea 
 value={formData.description} 
 onChange={e => setFormData({...formData, description: e.target.value})} 
 className="border-[#eee] min-h-[100px]" 
 placeholder="Module description..." 
 />
 </div>
 <div className="space-y-2">
 <Label>Duration (Seconds)</Label>
 <Input 
 type="number" 
 value={formData.duration_seconds} 
 onChange={e => setFormData({...formData, duration_seconds: parseInt(e.target.value)})} 
 className="border-[#eee]" 
 />
 </div>
 <DialogFooter>
 <Button type="submit" disabled={loading} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white">
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
 const [formData, setFormData] = useState({ title: module?.title || '', description: module?.description || '', duration_seconds: module?.duration_seconds || 3600 });

 useEffect(() => {
 if (module) {
 setFormData({ title: module.title || '', description: module.description || '', duration_seconds: module.duration_seconds || 3600 });
 }
 }, [module]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 await api.admin.updateModule(module.id, {
 ...formData,
 course_id: parseInt(courseId),
 order: module.order || 0
 });
 toast.success('Module updated');
 onUpdated();
 } catch (e: any) { toast.error(e.message); }
 finally { setLoading(false); }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
 <DialogContent className="bg-white">
 <DialogHeader>
 <DialogTitle>Edit Module</DialogTitle>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4 pt-4">
 <div className="space-y-2">
 <Label>Module Title</Label>
 <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="border-[#eee]" required />
 </div>
 <div className="space-y-2">
 <Label>Description</Label>
 <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="border-[#eee] min-h-[100px]" required />
 </div>
 <div className="space-y-2">
 <Label>Duration (Seconds)</Label>
 <Input type="number" value={formData.duration_seconds} onChange={e => setFormData({...formData, duration_seconds: parseInt(e.target.value)})} className="border-[#eee]" min="1" />
 </div>
 <DialogFooter>
 <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
 <Button type="submit" disabled={loading} className="bg-[#F26522] hover:bg-[#D54D10] text-white">
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
 } catch (e: any) {
 toast.error(e.message || 'Failed to delete module');
 } finally {
 setDeleting(false);
 }
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
