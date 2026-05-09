'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
 FileText, Download, CheckCircle2, 
 Sparkles, Loader2, ArrowRight, Zap,
 FileDown, BookOpen, ChevronRight
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

export default function ModuleMaterialsPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
 const { id, moduleId } = use(params);
 const [module, setModule] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [completing, setCompleting] = useState(false);
 const [isCompleted, setIsCompleted] = useState(false);

 useEffect(() => {
 fetchData();
 }, [moduleId]);

 const fetchData = async () => {
 try {
 setLoading(true);
 const [moduleData, progressData] = await Promise.all([
 api.common.getModule(parseInt(moduleId)),
 api.employee.getModuleProgressDetail(parseInt(id), parseInt(moduleId))
 ]);
 setModule(moduleData);
 setIsCompleted(progressData.notes_completed);
 } catch (error) { console.error(error); }
 finally { setLoading(false); }
 };

 const markAsRead = async () => {
 try {
 setCompleting(true);
 await api.employee.updateDetailedProgress({
 course_id: parseInt(id),
 module_id: parseInt(moduleId),
 notes_viewed: true
 });
 setIsCompleted(true);
 toast.success('Notes marked as read!');
 } catch (error) { toast.error('Failed to update progress'); }
 finally { setCompleting(false); }
 };

 if (loading) return (
 <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
 {[1, 2].map(i => <div key={i} className="h-64 bg-muted rounded-xl border border-border" />)}
 </div>
 );

 return (
 <div className="space-y-6 pb-12">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h2 className="text-xl font-semibold text-foreground tracking-tight">Module Resources</h2>
 <p className="text-sm text-muted-foreground mt-1">Access comprehensive guides, whitepapers, and technical specs.</p>
 </div>
 <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
 <BookOpen className="w-4 h-4 text-muted-foreground/50" />
 <span className="text-sm font-medium text-foreground">{module?.notes?.length || 0} Assets</span>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
 {module?.notes?.length > 0 ? (
 module.notes.map((note: any) => (
 <Card key={note.id} className="bg-card border border-border shadow-sm hover:shadow-md transition-all group rounded-2xl">
 <CardContent className="p-5 space-y-4">
 <div className="flex justify-between items-start">
 <div className="w-10 h-10 bg-muted rounded-xl border border-border flex items-center justify-center text-muted-foreground transition-transform">
 <FileText className="w-5 h-5" />
 </div>
 <Badge variant="secondary" className="text-xs uppercase tracking-wider bg-muted text-muted-foreground border-none">
 {note.file_type}
 </Badge>
 </div>
 
 <div>
 <h4 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-[#F26522] transition-colors">{note.title || 'Technical Unit Notes'}</h4>
 <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">In-depth exploration of the core concepts discussed in this module session.</p>
 </div>
 
 <div className="space-y-2 pt-2 border-t border-border">
 <a 
 href={note.file_url} 
 target="_blank" 
 rel="noreferrer"
 className="flex items-center justify-center gap-2 w-full h-10 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-xs font-semibold transition-all shadow-sm"
 >
 <FileDown className="w-4 h-4" /> Download
 </a>
 <SummarizeNotesButton moduleId={parseInt(moduleId)} />
 </div>
 </CardContent>
 </Card>
 ))
 ) : (
 <div className="col-span-full flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border text-muted-foreground">
 <FileText className="w-10 h-10 mb-3 opacity-20" />
 <p className="text-sm font-medium">No assets available for this module.</p>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between pt-8 border-t border-border">
 <Button 
 onClick={markAsRead}
 disabled={completing || isCompleted}
 variant={isCompleted ? "outline" : "default"}
 className={cn(
 "h-12 px-8 rounded-2xl font-bold text-sm gap-2 transition-all",
 isCompleted 
 ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20" 
 : "bg-foreground text-background hover:bg-foreground/90"
 )}
 >
 {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : isCompleted ? (
 <><CheckCircle2 className="w-4 h-4" /> Completed</>
 ) : (
 <><CheckCircle2 className="w-4 h-4" /> Mark as Read</>
 )}
 </Button>
 
 <Link href={`/courses/${id}/modules/${moduleId}/assignment`}>
 <Button variant="outline" className="h-12 px-8 rounded-2xl font-bold text-sm gap-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted">
 Next: Task <ArrowRight className="w-4 h-4" />
 </Button>
 </Link>
 </div>
 </div>
 );
}

function SummarizeNotesButton({ moduleId }: { moduleId: number }) {
 const [open, setOpen] = useState(false);
 const [summary, setSummary] = useState('');
 const [isLoading, setIsLoading] = useState(false);

 const handleSummarize = async () => {
 setOpen(true);
 if (summary) return;
 setIsLoading(true);
 try {
 const data = await api.ai.summarize(moduleId);
 setSummary(data.summary);
 } catch (e: any) { toast.error("AI Summarization failed"); setSummary("Error retrieving summary."); }
 finally { setIsLoading(false); }
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger render={
 <Button onClick={handleSummarize} variant="outline" className="w-full h-10 rounded-xl text-xs font-semibold text-[#F26522] border-[#F26522]/20 hover:bg-[#F26522]/5 gap-2 transition-all">
 <Sparkles className="w-3.5 h-3.5" /> AI Summary
 </Button>
 } />
 <DialogContent className="bg-card border-border p-8 rounded-xl max-w-2xl shadow-sm">
 <DialogHeader>
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 bg-[#F26522]/10 rounded-xl flex items-center justify-center text-[#F26522]">
 <Sparkles className="w-6 h-6" />
 </div>
 <DialogTitle className="text-xl font-bold text-foreground">AI Intelligence Summary</DialogTitle>
 </div>
 </DialogHeader>
 <div className="p-6 bg-muted/50 border border-border rounded-2xl min-h-[250px] shadow-inner">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center h-full text-[#F26522] space-y-4 py-16">
 <Loader2 className="w-8 h-8 animate-spin" />
 <p className="text-xs font-bold uppercase text-muted-foreground animate-pulse">Synthesizing Notes...</p>
 </div>
 ) : (
 <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed font-medium">
 {summary.split('\n').map((line, i) => <p key={i} className="mb-3">{line}</p>)}
 </div>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
}
