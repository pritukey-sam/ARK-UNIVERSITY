'use client';

import React from 'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteConfirmDialogProps {
 title?: string;
 description?: string;
 onConfirm: () => Promise<void>;
 trigger?: React.ReactNode;
 className?: string;
 itemName?: string;
}

export default function DeleteConfirmDialog({
 title = "Are you sure?",
 description = "This action cannot be undone. This will permanently delete the item.",
 onConfirm,
 trigger,
 className,
 itemName
}: DeleteConfirmDialogProps) {
 const [open, setOpen] = React.useState(false);
 const [loading, setLoading] = React.useState(false);

 const handleConfirm = async (e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 setLoading(true);
 await onConfirm();
 setOpen(false);
 } catch (error) {
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger render={trigger || (
 <Button variant="ghost" size="sm" className={cn("text-gray-400 hover:text-red-600 h-8 w-8 p-0", className)}>
 <Trash2 className="w-4 h-4" />
 </Button>
 )} />
 <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-sm">
 <div className="bg-white p-8">
 <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6 mx-auto">
 <AlertTriangle className="w-8 h-8 text-red-500" />
 </div>
 
 <div className="text-center space-y-2 mb-8">
 <DialogHeader>
 <DialogTitle className="text-2xl font-bold text-gray-900 leading-none">
 {title}
 </DialogTitle>
 </DialogHeader>
 <p className="text-gray-500 text-sm font-medium px-4">
 {description} {itemName && <span className="font-bold text-gray-700">"{itemName}"</span>}
 </p>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <Button 
 variant="ghost" 
 onClick={() => setOpen(false)}
 disabled={loading}
 className="h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
 >
 Cancel
 </Button>
 <Button 
 variant="destructive" 
 onClick={handleConfirm}
 disabled={loading}
 className="h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all uppercase text-xs"
 >
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Forever"}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
