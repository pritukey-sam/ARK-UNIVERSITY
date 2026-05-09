'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
 Upload, Download, CheckCircle2, 
 Bot, Loader2, ArrowRight, Bookmark,
 Clock, ShieldCheck, FileArchive, FileDown,
 Sparkles, GraduationCap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export default function ModuleAssignmentPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
 const { id, moduleId } = use(params);
 const [module, setModule] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [submitted, setSubmitted] = useState(false);

 useEffect(() => { fetchData(); }, [moduleId]);

 const fetchData = async () => {
 try {
 setLoading(true);
 const [moduleData, progressData] = await Promise.all([
 api.common.getModule(parseInt(moduleId)),
 api.employee.getModuleProgressDetail(parseInt(id), parseInt(moduleId))
 ]);
 setModule(moduleData);
 setSubmitted(progressData.assignment_submitted);
 } catch (error) { console.error(error); }
 finally { setLoading(false); }
 };

 if (loading) return (
 <div className="animate-pulse flex flex-col items-center justify-center min-h-[500px]">
 <div className="w-full max-w-3xl h-[400px] bg-muted rounded-xl border border-border" />
 </div>
 );

 return (
 <div className="space-y-6 pb-12">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h2 className="text-xl font-semibold text-foreground tracking-tight">Unit Deliverable</h2>
 <p className="text-sm text-muted-foreground mt-1">Demonstrate your mastery through hands-on implementation.</p>
 </div>
 <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
 <GraduationCap className="w-4 h-4 text-muted-foreground/50" />
 <span className="text-sm font-medium text-foreground">Project Based</span>
 </div>
 </div>

 <div className="max-w-4xl space-y-6">
 {module?.assignments?.length > 0 ? (
 module.assignments.map((assignment: any) => (
 <div key={assignment.id} className="bg-card border border-border rounded-2xl p-8 space-y-8 shadow-sm">
 <div className="flex flex-col md:flex-row gap-6 items-start">
 <div className="p-4 bg-muted rounded-xl border border-border shrink-0">
 <Bookmark className="w-6 h-6 text-[#F26522]" />
 </div>
 <div className="space-y-4 flex-1">
 <div className="flex flex-wrap gap-2">
 <Badge variant="secondary" className="bg-muted text-muted-foreground font-semibold text-xs uppercase tracking-wider px-3 py-1 border-none">Required Task</Badge>
 {submitted && (
 <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-xs uppercase tracking-wider px-3 py-1 flex items-center">
 <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Submitted
 </Badge>
 )}
 </div>
 <h3 className="text-xl font-bold text-foreground tracking-tight">{assignment.title}</h3>
 <p className="text-sm text-muted-foreground leading-relaxed">
 {assignment.description || "Synthesize your learnings into a cohesive project structure. Follow the instructions and submit your finalized architecture as a ZIP archive."}
 </p>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row gap-4 pt-2">
 <a 
 href={assignment.file_url} 
 target="_blank" 
 rel="noreferrer"
 className="flex items-center justify-center gap-2 px-6 h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-sm font-bold transition-all shadow-sm"
 >
 <FileDown className="w-4 h-4" /> Instructions.pdf
 </a>
 <div className="sm:w-auto w-full">
 <AssignmentHelpButton assignmentId={assignment.id} />
 </div>
 </div>

 <div className="pt-8 border-t border-border">
 <SubmissionHandler 
 moduleId={parseInt(moduleId)} 
 courseId={parseInt(id)} 
 submitted={submitted}
 onSuccess={() => setSubmitted(true)}
 />
 </div>
 </div>
 ))
 ) : (
 <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border text-muted-foreground">
 <Bookmark className="w-10 h-10 mb-3 opacity-20" />
 <p className="text-sm font-medium">No deliverables required for this module.</p>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between pt-8 border-t border-border max-w-4xl">
 <Link href={`/courses/${id}/modules/${moduleId}/quiz`} className="ml-auto">
 <Button className="h-12 px-8 rounded-2xl font-bold text-sm gap-2 bg-[#F26522] hover:bg-[#D54D10] text-white shadow-lg">
 Next: Assessment <ArrowRight className="w-4 h-4" />
 </Button>
 </Link>
 </div>
 </div>
 );
}

function SubmissionHandler({ moduleId, courseId, submitted, onSuccess }: any) {
 const [uploading, setUploading] = useState(false);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.name.endsWith('.zip')) {
 toast.error('Only ZIP archives are accepted for verification');
 return;
 }

 const formData = new FormData();
 formData.append('file', file);

 try {
 setUploading(true);
 await api.employee.submitAssignment(moduleId, formData);
 await api.employee.updateDetailedProgress({
 course_id: courseId,
 module_id: moduleId,
 assignment_submitted: true
 });
 toast.success('Project submitted successfully!');
 onSuccess();
 } catch (error: any) {
 toast.error(error.message || 'Submission engine failure');
 } finally {
 setUploading(false);
 }
 };

 if (submitted) {
 return (
 <div className="flex items-center justify-between bg-emerald-500/10 text-emerald-500 px-6 py-5 rounded-2xl border border-emerald-500/20 text-sm shadow-inner">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
 <FileArchive className="w-5 h-5 text-emerald-500" />
 </div>
 <span className="font-bold tracking-tight">Assignment Finalized & Submitted</span>
 </div>
 <CheckCircle2 className="w-6 h-6" />
 </div>
 );
 }

 return (
 <div className="w-full">
 <label className="flex flex-col items-center justify-center px-6 py-12 bg-muted/50 border-2 border-dashed border-border hover:border-[#F26522] text-muted-foreground hover:text-[#F26522] hover:bg-[#F26522]/5 rounded-3xl cursor-pointer transition-all group">
 <div className="flex flex-col items-center gap-4">
 <div className="w-14 h-14 bg-muted border border-border rounded-2xl flex items-center justify-center transition-transform shadow-sm">
 <Upload className="w-7 h-7" />
 </div>
 <div className="text-center">
 <span className="font-bold text-base block">{uploading ? 'Processing Data...' : 'Submit Deliverable'}</span>
 <p className="text-xs text-muted-foreground mt-1 font-medium">Standard ZIP archive (Max 50MB)</p>
 </div>
 </div>
 <input type="file" className="hidden" accept=".zip" onChange={handleFileUpload} disabled={uploading} />
 </label>
 </div>
 );
}

function AssignmentHelpButton({ assignmentId }: { assignmentId: number }) {
 const [open, setOpen] = useState(false);
 const [helpText, setHelpText] = useState('');
 const [isLoading, setIsLoading] = useState(false);

 const handleHelp = async () => {
 setOpen(true);
 if (helpText) return;
 setIsLoading(true);
 try {
 const data = await api.ai.assignmentHelp(assignmentId);
 setHelpText(data.help);
 } catch (e: any) { toast.error("AI Guidance engine offline"); setHelpText("Error retrieving AI assistance."); }
 finally { setIsLoading(false); }
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger render={
 <Button onClick={handleHelp} variant="outline" className="w-full h-12 rounded-xl text-xs font-bold text-foreground bg-card border-border hover:bg-muted gap-2 flex-1 shadow-sm transition-all">
 <Bot className="w-5 h-5 text-[#F26522]" /> Get Intelligence Guidance
 </Button>
 } />
 <DialogContent className="bg-card border-border p-8 rounded-xl max-w-2xl shadow-sm">
 <DialogHeader>
 <div className="flex items-center gap-4 mb-4">
 <div className="w-12 h-12 bg-[#F26522]/10 rounded-xl flex items-center justify-center text-[#F26522]">
 <Bot className="w-7 h-7" />
 </div>
 <DialogTitle className="text-xl font-bold text-foreground">AI Implementation Guidance</DialogTitle>
 </div>
 </DialogHeader>
 <div className="p-6 bg-muted/50 border border-border rounded-2xl min-h-[250px] shadow-inner">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center h-full text-[#F26522] space-y-4 py-16">
 <Loader2 className="w-8 h-8 animate-spin" />
 <p className="text-xs font-bold uppercase text-muted-foreground animate-pulse">Analyzing task requirements...</p>
 </div>
 ) : (
 <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed font-medium">
 {helpText.split('\n').map((line, i) => <p key={i} className="mb-3">{line}</p>)}
 </div>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
}
