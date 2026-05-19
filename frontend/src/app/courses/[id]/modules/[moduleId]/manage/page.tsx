'use client';

import React, { useState, useEffect, use } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
 ArrowLeft, Video, FileText, Upload, Sparkles, Loader2, 
 PlayCircle, Trophy, Trash2, ExternalLink, User, Clock, 
 Plus, Edit2, Folder, CheckCircle2, ChevronRight, Save, LayoutGrid, List, FileArchive
} from 'lucide-react';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { cn, formatDuration, parseDuration } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogTrigger,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';

export default function ManageModulePage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
 const router = useRouter();
 const resolvedParams = React.use(params);
 const courseId = parseInt(resolvedParams.id);
 const moduleId = parseInt(resolvedParams.moduleId);

 // Redirect old separate manage flow to the new unified preview/manage watch page
 useEffect(() => {
   if (courseId && moduleId) {
     router.replace(`/courses/${courseId}/modules/${moduleId}/preview`);
   }
 }, [courseId, moduleId, router]);

 const [course, setCourse] = useState<any>(null);
 const [moduleData, setModuleData] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'video' | 'notes' | 'task' | 'quiz'>('video');

 // Title editing
 const [moduleTitle, setModuleTitle] = useState('');
 const [isEditing, setIsEditing] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // Forms
 const [videoTitle, setVideoTitle] = useState('');
 const [videoDescription, setVideoDescription] = useState('');
 const [videoMode, setVideoMode] = useState<'upload' | 'link'>('upload');
 const [externalVideoUrl, setExternalVideoUrl] = useState('');
 const [videoFile, setVideoFile] = useState<File | null>(null);
 const [videoDuration, setVideoDuration] = useState('');
 const [uploadingVideo, setUploadingVideo] = useState(false);
 const [isFetchingDuration, setIsFetchingDuration] = useState(false);

 const [notesFile, setNotesFile] = useState<File | null>(null);
 const [uploadingNotes, setUploadingNotes] = useState(false);

 const [taskTitle, setTaskTitle] = useState('');
 const [taskFile, setTaskFile] = useState<File | null>(null);
 const [uploadingTask, setUploadingTask] = useState(false);

 const [quizFile, setQuizFile] = useState<File | null>(null);
 const [uploadingQuiz, setUploadingQuiz] = useState(false);

 useEffect(() => {
 fetchData();
 }, [courseId, moduleId]);

 useEffect(() => {
 if (videoMode === 'upload' && videoFile) {
 extractFileDuration(videoFile);
 }
 }, [videoFile, videoMode]);

 useEffect(() => {
 if (videoMode === 'link' && externalVideoUrl) {
 const timer = setTimeout(() => {
 extractLinkDuration(externalVideoUrl);
 }, 1000);
 return () => clearTimeout(timer);
 }
 }, [externalVideoUrl, videoMode]);

 const extractFileDuration = (file: File) => {
 setIsFetchingDuration(true);
 const video = document.createElement('video');
 video.preload = 'metadata';
 video.onloadedmetadata = () => {
 window.URL.revokeObjectURL(video.src);
 setVideoDuration(formatDuration(Math.round(video.duration)));
 setIsFetchingDuration(false);
 };
 video.onerror = () => {
 toast.error("Unable to fetch file duration");
 setIsFetchingDuration(false);
 };
 video.src = URL.createObjectURL(file);
 };

 const extractLinkDuration = async (url: string) => {
 if (!url.match(/^(http|https):\/\//)) return;
 setIsFetchingDuration(true);
 try {
 // YouTube Detection
 const ytId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1];
 
 if (ytId) {
 const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
 } else if (url.toLowerCase().endsWith('.mp4')) {
 const video = document.createElement('video');
 video.preload = 'metadata';
 video.onloadedmetadata = () => {
 setVideoDuration(formatDuration(Math.round(video.duration)));
 setIsFetchingDuration(false);
 };
 video.src = url;
 return;
 }
 } catch (e) {
 console.error("Link duration fetch failed", e);
 } finally {
 setIsFetchingDuration(false);
 }
 };

 const fetchData = async () => {
 try {
 setLoading(true);
 const [courseRes, moduleRes] = await Promise.all([
 api.common.getCourse(courseId),
 api.common.getModule(moduleId)
 ]);
 setCourse(courseRes);
 setModuleData(moduleRes);
 setModuleTitle(moduleRes.title);
 } catch (error) {
 toast.error('Failed to load data');
 } finally {
 setLoading(false);
 }
 };

 const handleUpdateModule = async () => {
 if (!isEditing) {
 setIsEditing(true);
 return;
 }
 try {
 setIsSaving(true);
 await api.admin.updateModule(moduleId, { 
 title: moduleTitle
 });
 toast.success('Module updated');
 setIsEditing(false);
 fetchData();
 } catch (e: any) {
 toast.error(e.message || 'Failed to update module');
 } finally {
 setIsSaving(false);
 }
 };

 const handleAddModule = async (title: string, description: string) => {
 try {
 const orderIndex = course?.modules?.length + 1 || 1;
 const newMod = await api.admin.createModule(courseId, { 
 title, 
 order_index: orderIndex 
 });
 toast.success('Module created');
 router.push(`/courses/${courseId}/modules/${newMod.id}/manage`);
 } catch (e: any) {
 toast.error(e.message || 'Failed to create module');
 }
 };

 const handleDeleteModule = async (id: number) => {
 try {
 await api.admin.deleteModule(id);
 toast.success('Module deleted');
 if (id === moduleId) {
 router.push(`/courses/${courseId}`);
 } else {
 fetchData();
 }
 } catch (e: any) {
 toast.error(e.message || 'Delete failed');
 }
 };

 const handleDeleteItem = async (type: string, id: number) => {
 try {
 if (type === 'video') await api.admin.deleteVideo(id);
 if (type === 'notes') await api.admin.deleteNotes(id);
 if (type === 'assignment') await api.admin.deleteAssignment(id);
 if (type === 'quiz') await api.admin.deleteQuiz(id);
 toast.success('Item deleted');
 fetchData();
 } catch (e: any) {
 toast.error(e.message || 'Delete failed');
 }
 };

 const handleUploadVideo = async () => {
 if (!videoTitle) return;
 try {
 setUploadingVideo(true);
 let finalUrl = '';
 
 if (videoMode === 'upload') {
 if (!videoFile) return;
 const formData = new FormData();
 formData.append('video', videoFile);
 const uploadRes = await api.admin.uploadVideo(formData);
 finalUrl = uploadRes.video_url;
 } else {
 if (!externalVideoUrl) {
 toast.error("Please enter a valid URL");
 setUploadingVideo(false);
 return;
 }
 finalUrl = externalVideoUrl;
 }

 await api.admin.addVideo(moduleId, { 
 title: videoTitle, 
 video_url: finalUrl, 
 duration_seconds: parseDuration(videoDuration),
 description: videoDescription
 });
 toast.success('Video added');
 setVideoFile(null);
 setExternalVideoUrl('');
 setVideoTitle('');
 setVideoDuration('');
 setVideoDescription('');
 fetchData();
 } catch (e: any) {
 toast.error(e.message);
 } finally {
 setUploadingVideo(false);
 }
 };

 const handleUploadNotes = async () => {
 if (!notesFile) return;
 try {
 setUploadingNotes(true);
 const formData = new FormData();
 formData.append('file', notesFile);
 await api.admin.addNotes(moduleId, formData);
 toast.success('Notes uploaded');
 setNotesFile(null);
 fetchData();
 } catch (e: any) {
 toast.error(e.message);
 } finally {
 setUploadingNotes(false);
 }
 };

 const handleUploadTask = async () => {
 if (!taskFile || !taskTitle) return;
 try {
 setUploadingTask(true);
 const formData = new FormData();
 formData.append('file', taskFile);
 formData.append('title', taskTitle);
 await api.admin.addAssignment(moduleId, formData);
 toast.success('Task created');
 setTaskFile(null);
 setTaskTitle('');
 fetchData();
 } catch (e: any) {
 toast.error(e.message);
 } finally {
 setUploadingTask(false);
 }
 };

 const handleUploadQuizBulk = async () => {
 if (!quizFile) return;
 try {
 setUploadingQuiz(true);
 const formData = new FormData();
 formData.append('file', quizFile);
 const res = await api.admin.bulkQuizPreview(moduleId, formData);
 const validQuestions = res.questions.filter((q: any) => !q.error);
 if (validQuestions.length === 0) {
 toast.error('No valid questions found in Excel file.');
 setUploadingQuiz(false);
 return;
 }
 await api.admin.bulkQuizConfirm(moduleId, { questions: validQuestions });
 toast.success('Quiz imported successfully');
 setQuizFile(null);
 fetchData();
 } catch (e: any) {
 toast.error(e.message);
 } finally {
 setUploadingQuiz(false);
 }
 };

 if (loading || !course || !moduleData) return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-4">
 <Loader2 className="w-8 h-8 animate-spin text-[#F26522]" />
 <p className="text-sm text-gray-500 font-medium">Loading builder...</p>
 </div>
 );

 return (
 <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col md:flex-row">
 
 {/* LEFT SIDEBAR (30%) */}
 <aside className="w-full md:w-72 lg:w-80 bg-white border-r border-gray-200 flex flex-col h-auto md:h-screen sticky top-0">
 <div className="p-4 border-b border-gray-200 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-[#F26522]/10 rounded-lg flex items-center justify-center text-[#F26522]">
 <Folder className="w-4 h-4" />
 </div>
 <span className="text-sm font-bold text-gray-900">Modules</span>
 </div>
 <AddModuleModal onAdd={handleAddModule} />
 </div>
 <div className="p-4 overflow-y-auto custom-scrollbar">
 <h2 className="text-sm font-semibold text-gray-900 mb-4 px-2">Course Curriculum</h2>
 <div className="space-y-1">
 {course.modules?.map((m: any, idx: number) => (
 <div 
 key={m.id} 
 onClick={() => router.push(`/courses/${courseId}/modules/${m.id}/manage`)}
 className={cn(
 "group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm",
 m.id === moduleId 
 ? "bg-[#F26522]/10 text-[#F26522] font-medium" 
 : "text-gray-600 hover:bg-gray-50"
 )}
 >
 <div className="flex items-center gap-2 truncate">
 <span className="text-xs opacity-50 w-4">{idx + 1}.</span>
 <span className="truncate">{m.title}</span>
 </div>
 {course.modules.length > 1 && (
 <button 
 onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id); }}
 className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 ))}
 </div>
 </div>
 </aside>

 {/* RIGHT CONTENT BUILDER (70%) */}
   <main className="flex-1 bg-white p-6 lg:p-10 overflow-y-auto">
 <div className="max-w-4xl mx-auto space-y-8">
 
 {/* Top Title & Description Edit */}
 <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
 <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
 <div className="flex-1 w-full space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">Module Title</Label>
 {isEditing ? (
 <Input 
 value={moduleTitle} 
 onChange={(e) => setModuleTitle(e.target.value)} 
 className="text-lg font-semibold border-gray-200 focus:ring-[#F26522]/10 h-11 px-4 rounded-xl transition-all"
 placeholder="Enter module title..."
 />
 ) : (
 <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{moduleTitle}</h1>
 )}
 </div>
 </div>
 
 <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
 <Button 
 variant="outline"
 onClick={() => router.push(`/courses/${courseId}/modules/${moduleId}/preview`)}
 className="flex-1 sm:w-32 h-11 rounded-xl font-bold border-[#eee] text-[#111] hover:bg-white transition-all shadow-sm"
 >
 <PlayCircle className="w-4 h-4 mr-2" /> Preview
 </Button>

 <Button 
 onClick={handleUpdateModule} 
 disabled={isSaving}
 className={cn(
 "flex-1 sm:w-32 h-11 rounded-xl font-bold transition-all shadow-sm",
 isEditing 
 ? "bg-[#F26522] hover:bg-[#D54D10] text-white" 
 : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
 )}
 >
 {isSaving ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : isEditing ? (
 <><Save className="w-4 h-4 mr-2" /> Save</>
 ) : (
 <><Edit2 className="w-4 h-4 mr-2" /> Edit</>
 )}
 </Button>
 
 {isEditing && (
 <Button 
 variant="ghost" 
 onClick={() => {
 setIsEditing(false);
 setModuleTitle(moduleData.title);
 }}
 className="flex-1 sm:w-32 h-11 rounded-xl font-bold text-gray-500 hover:text-gray-900"
 >
 Cancel
 </Button>
 )}
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex overflow-x-auto hide-scrollbar gap-2 border-b border-gray-200 pb-px">
 {[
 { id: 'video', label: 'Video', icon: Video },
 { id: 'notes', label: 'Notes', icon: FileText },
 { id: 'task', label: 'Task', icon: Folder },
 { id: 'quiz', label: 'Quiz', icon: Trophy }
 ].map(t => (
 <button
 key={t.id}
 onClick={() => setActiveTab(t.id as any)}
 className={cn(
 "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
 activeTab === t.id 
 ? "border-[#F26522] text-[#F26522]" 
 : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
 )}
 >
 <t.icon className="w-4 h-4" /> {t.label}
 </button>
 ))}
 </div>

 {/* Content Area */}
 <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
 
 {/* VIDEO TAB */}
 {activeTab === 'video' && (
 <div className="space-y-8">
 <div>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
 <h3 className="text-base font-semibold text-gray-900">Add Video Lesson</h3>
 <div className="flex bg-gray-100 p-1 rounded-md">
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-7 px-3 text-xs", videoMode === 'upload' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
 onClick={() => setVideoMode('upload')}
 >
 Upload Video
 </Button>
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-7 px-3 text-xs", videoMode === 'link' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
 onClick={() => setVideoMode('link')}
 >
 Add Video Link
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
 <div className="space-y-1.5">
 <Label className="text-xs text-gray-600">Video Title</Label>
 <Input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} className="h-9 text-sm" placeholder="e.g. Introduction" />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs text-gray-600">Duration (e.g. 15, 1:30, 1:20:30)</Label>
 <div className="relative">
 <Input 
 type="text" 
 value={videoDuration} 
 onChange={e=>setVideoDuration(e.target.value)} 
 className="h-9 text-sm pr-20" 
 placeholder="e.g. 15 or 1:30" 
 />
 {isFetchingDuration && (
 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-orange-500 font-bold bg-white px-1">
 <Loader2 className="w-3 h-3 animate-spin" />
 <span className="animate-pulse">FETCHING...</span>
 </div>
 )}
 </div>
 </div>

 <div className="sm:col-span-2 space-y-1.5">
 <Label className="text-xs text-gray-600">Video Description</Label>
 <Textarea 
 value={videoDescription} 
 onChange={e=>setVideoDescription(e.target.value)} 
 className="min-h-[80px] text-sm" 
 placeholder="Briefly explain what happens in this lesson..." 
 />
 </div>
 
 <div className="sm:col-span-2 mt-1">
 {videoMode === 'upload' ? (
 <div className="flex gap-3 items-center">
 <Input type="file" accept="video/mp4" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="h-9 text-sm flex-1" />
 <Button onClick={handleUploadVideo} disabled={!videoFile || !videoTitle || uploadingVideo} className="h-9 bg-[#F26522] hover:bg-[#D54D10] text-white min-w-[100px]">
 {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Upload"}
 </Button>
 </div>
 ) : (
 <div className="flex gap-3 items-start">
 <div className="flex-1 space-y-1.5">
 <Input 
 type="url" 
 value={externalVideoUrl} 
 onChange={e => setExternalVideoUrl(e.target.value)} 
 className="h-9 text-sm w-full" 
 placeholder="Paste YouTube, Vimeo, or direct video URL" 
 />
 </div>
 <Button onClick={handleUploadVideo} disabled={!externalVideoUrl || !videoTitle || uploadingVideo} className="h-9 bg-[#F26522] hover:bg-[#D54D10] text-white min-w-[100px]">
 {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Link"}
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>

 {moduleData.videos?.length > 0 && (
 <div className="space-y-3 pt-6 border-t border-gray-100">
 <h4 className="text-sm font-medium text-gray-900">Uploaded Videos</h4>
 <div className="space-y-2">
 {moduleData.videos.map((v: any) => (
 <div key={v.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400">
 <PlayCircle className="w-4 h-4" />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-900">{v.title}</p>
 <p className="text-xs text-gray-500">{formatDuration(v.duration_seconds)}</p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 <EditVideoDialog video={v} onUpdated={fetchData} />
 <Button variant="ghost" size="sm" onClick={() => handleDeleteItem('video', v.id)} className="text-gray-400 hover:text-red-600 h-8 w-8 p-0">
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* NOTES TAB */}
 {activeTab === 'notes' && (
 <div className="space-y-8">
 <div>
 <h3 className="text-base font-semibold text-gray-900 mb-4">Upload PDF Notes</h3>
 <div className="flex items-center gap-3">
 <Input type="file" accept=".pdf" onChange={e => setNotesFile(e.target.files?.[0] || null)} className="h-9 text-sm flex-1" />
 <Button onClick={handleUploadNotes} disabled={!notesFile || uploadingNotes} className="h-9 bg-[#F26522] hover:bg-[#D54D10] text-white px-6">
 {uploadingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
 </Button>
 </div>
 </div>

 {moduleData.notes?.length > 0 && (
 <div className="space-y-3 pt-6 border-t border-gray-100">
 <h4 className="text-sm font-medium text-gray-900">Available Notes</h4>
 <div className="space-y-2">
 {moduleData.notes.map((n: any, i: number) => (
 <div key={n.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-blue-500">
 <FileText className="w-4 h-4" />
 </div>
 <p className="text-sm font-medium text-gray-900">Document {i + 1}.pdf</p>
 </div>
 <div className="flex items-center gap-1">
 <a href={n.file_url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-blue-600">
 <ExternalLink className="w-4 h-4" />
 </a>
 <Button variant="ghost" size="sm" onClick={() => handleDeleteItem('notes', n.id)} className="text-gray-400 hover:text-red-600 h-8 w-8 p-0">
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* TASK TAB */}
 {activeTab === 'task' && (
 <div className="space-y-8">
 <div>
 <h3 className="text-base font-semibold text-gray-900 mb-4">Create Deliverable Task</h3>
 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs text-gray-600">Task Title</Label>
 <Input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} className="h-9 text-sm" placeholder="e.g. Final Project Submission" />
 </div>
 <div className="space-y-1.5 flex gap-3 items-center">
 <Input type="file" onChange={e => setTaskFile(e.target.files?.[0] || null)} className="h-9 text-sm flex-1" />
 <Button onClick={handleUploadTask} disabled={!taskFile || !taskTitle || uploadingTask} className="h-9 bg-[#F26522] hover:bg-[#D54D10] text-white px-6">
 {uploadingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
 </Button>
 </div>
 </div>
 </div>

 {moduleData.assignments?.length > 0 && (
 <div className="space-y-3 pt-6 border-t border-gray-100">
 <h4 className="text-sm font-medium text-gray-900">Current Tasks</h4>
 <div className="space-y-2">
 {moduleData.assignments.map((a: any) => (
 <div key={a.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-emerald-600">
 <Folder className="w-4 h-4" />
 </div>
 <p className="text-sm font-medium text-gray-900">{a.title}</p>
 </div>
 <div className="flex items-center gap-1">
 <a href={a.file_url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-emerald-600">
 <ExternalLink className="w-4 h-4" />
 </a>
 <Button variant="ghost" size="sm" onClick={() => handleDeleteItem('assignment', a.id)} className="text-gray-400 hover:text-red-600 h-8 w-8 p-0">
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* QUIZ TAB */}
 {activeTab === 'quiz' && (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-semibold text-gray-900">Manage Quizzes</h3>
 <Button variant="outline" size="sm" className="h-8 text-xs border-gray-300 text-gray-600" onClick={async () => {
 try {
 const token = localStorage.getItem('token');
 const response = await fetch('/api/quizzes/sample-template', { headers: { 'Authorization': `Bearer ${token}` } });
 const blob = await response.blob();
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = 'quiz_template.xlsx';
 document.body.appendChild(a); a.click();
 window.URL.revokeObjectURL(url);
 } catch (e) {}
 }}>
 Download Template
 </Button>
 </div>

 <div className="flex items-center gap-3">
 <Input type="file" accept=".xlsx,.xls,.csv" onChange={e => setQuizFile(e.target.files?.[0] || null)} className="h-9 text-sm flex-1" />
 <Button onClick={handleUploadQuizBulk} disabled={!quizFile || uploadingQuiz} className="h-9 bg-[#F26522] hover:bg-[#D54D10] text-white px-6">
 {uploadingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Quiz"}
 </Button>
 </div>

 {moduleData.quizzes?.length > 0 && (
 <div className="space-y-3 pt-6 border-t border-gray-100">
 <h4 className="text-sm font-medium text-gray-900">Active Quizzes</h4>
 <div className="space-y-2">
 {moduleData.quizzes.map((q: any) => (
 <div key={q.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-amber-500">
 <Trophy className="w-4 h-4" />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-900">{q.title}</p>
 <p className="text-xs text-gray-500">{q.question_count || 0} questions</p>
 </div>
 </div>
 <Button variant="ghost" size="sm" onClick={() => handleDeleteItem('quiz', q.id)} className="text-gray-400 hover:text-red-600 h-8 w-8 p-0">
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 </div>
 </div>
 </main>

 </div>
 );
}

function AddModuleModal({ onAdd }: { onAdd: (title: string, description: string) => Promise<void> }) {
 const [open, setOpen] = useState(false);
 const [title, setTitle] = useState('');
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) return;
 setLoading(true);
 await onAdd(title, '');
 setLoading(false);
 setOpen(false);
 setTitle('');
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger render={
 <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[#F26522] hover:bg-[#F26522]/10 rounded-full">
 <Plus className="w-5 h-5" />
 </Button>
 } />
 <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-sm bg-white">
 <form onSubmit={handleSubmit} className="p-8 space-y-6">
 <div className="space-y-2">
 <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Module</h2>
 <p className="text-sm text-gray-500 font-medium">Add a new section to your course curriculum.</p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold uppercase text-gray-400 ml-1">Module Title</Label>
 <Input 
 value={title} 
 onChange={e => setTitle(e.target.value)} 
 placeholder="e.g. Advanced Concepts" 
 className="h-12 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#F26522]/10 transition-all font-medium"
 required 
 />
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <Button 
 type="button" 
 variant="ghost" 
 onClick={() => setOpen(false)}
 className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
 >
 Cancel
 </Button>
 <Button 
 type="submit" 
 disabled={loading || !title.trim()}
 className="flex-1 h-12 rounded-xl font-bold bg-[#F26522] hover:bg-[#D54D10] text-white shadow-lg transition-all uppercase text-xs"
 >
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Module"}
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}

function EditVideoDialog({ video, onUpdated }: { video: any, onUpdated: () => void }) {
 const [open, setOpen] = useState(false);
 const [title, setTitle] = useState(video.title);
 const [description, setDescription] = useState(video.description || '');
 const [duration, setDuration] = useState(formatDuration(video.duration_seconds || 0));
 const [videoUrl, setVideoUrl] = useState(video.video_url || '');
 const [isSaving, setIsSaving] = useState(false);

 const isExternal = video.video_url?.includes('youtube.com') || 
 video.video_url?.includes('youtu.be') || 
 video.video_url?.includes('vimeo.com') ||
 video.video_url?.startsWith('http');

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 setIsSaving(true);
 await api.admin.updateVideo(video.id, { 
 title, 
 description,
 duration_seconds: parseDuration(duration),
 video_url: isExternal ? videoUrl : video.video_url
 });
 toast.success('Video updated');
 setOpen(false);
 onUpdated();
 } catch (e: any) {
 toast.error(e.message || 'Failed to update video');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger render={
 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-[#F26522] h-8 w-8 p-0">
 <Edit2 className="w-4 h-4" />
 </Button>
 } />
 <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-sm bg-white">
 <form onSubmit={handleSubmit} className="p-8 space-y-6">
 <div className="space-y-2">
 <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Video Lesson</h2>
 <p className="text-sm text-gray-500 font-medium">Update the details of this lesson.</p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold uppercase text-gray-400 ml-1">Video Title</Label>
 <Input 
 value={title} 
 onChange={e => setTitle(e.target.value)} 
 className="h-12 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#F26522]/10 transition-all font-medium" 
 required 
 />
 </div>

 {isExternal && (
 <div className="space-y-1.5">
 <Label className="text-xs font-bold uppercase text-gray-400 ml-1">Video URL</Label>
 <Input 
 value={videoUrl} 
 onChange={e => setVideoUrl(e.target.value)} 
 className="h-12 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#F26522]/10 transition-all font-medium" 
 placeholder="Paste YouTube, Vimeo, or direct video URL"
 required 
 />
 </div>
 )}

 <div className="space-y-1.5">
 <Label className="text-xs font-bold uppercase text-gray-400 ml-1">Duration (e.g. 15, 1:30, 1:20:30)</Label>
 <Input 
 value={duration} 
 onChange={e => setDuration(e.target.value)} 
 className="h-12 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#F26522]/10 transition-all font-medium" 
 placeholder="e.g. 15 or 1:30"
 required 
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold uppercase text-gray-400 ml-1">Video Description</Label>
 <Textarea 
 value={description} 
 onChange={e => setDescription(e.target.value)} 
 className="min-h-[100px] rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#F26522]/10 transition-all font-medium text-sm" 
 placeholder="Lesson details..."
 />
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <Button 
 type="button" 
 variant="ghost" 
 onClick={() => setOpen(false)}
 className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
 >
 Cancel
 </Button>
 <Button 
 type="submit" 
 disabled={isSaving}
 className="flex-1 h-12 rounded-xl font-bold bg-[#F26522] hover:bg-[#D54D10] text-white shadow-lg transition-all uppercase text-xs"
 >
 {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}
