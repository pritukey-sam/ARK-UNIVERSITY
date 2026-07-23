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
 trigger?: React.ReactElement | null;
 className?: string;
 itemName?: string;
 open?: boolean;
 onOpenChange?: (open: boolean) => void;
}

export default function DeleteConfirmDialog({
 title = "Are you sure?",
 description = "This action cannot be undone. This will permanently delete the item.",
 onConfirm,
 trigger,
 className,
 itemName,
 open: controlledOpen,
 onOpenChange: controlledOnOpenChange
}: DeleteConfirmDialogProps) {
 const [localOpen, setLocalOpen] = React.useState(false);
 const [loading, setLoading] = React.useState(false);

 const open = controlledOpen !== undefined ? controlledOpen : localOpen;
 const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen;

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
 {trigger !== null && (
 <DialogTrigger render={trigger || (
 <Button variant="ghost" size="sm" className={cn("text-gray-400 hover:text-red-600 h-8 w-8 p-0", className)}>
 <Trash2 className="w-4 h-4" />
 </Button>
 )} />
 )}
 <DialogContent className="max-w-sm p-0 overflow-hidden rounded-xl border-none shadow-lg" showCloseButton={false} hideOverlay={true}>
 <div className="p-6">
 <div className="flex items-center gap-3 mb-4">
 <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 shrink-0">
 <AlertTriangle className="w-5 h-5 text-red-500" />
 </div>
 <div>
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-gray-900">
 {title}
 </DialogTitle>
 </DialogHeader>
 </div>
 </div>

 <p className="text-sm text-gray-500 mb-5 pl-[52px]">
 {description} {itemName && <span className="font-semibold text-gray-700">"{itemName}"</span>}
 </p>

 <div className="flex justify-end gap-2">
 <Button 
 variant="ghost" 
 size="sm"
 onClick={() => setOpen(false)}
 disabled={loading}
 className="h-9 px-4 rounded-lg font-medium text-gray-500 hover:bg-gray-100"
 >
 Cancel
 </Button>
 <Button 
 variant="destructive" 
 size="sm"
 onClick={handleConfirm}
 disabled={loading}
 className="h-9 px-4 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white"
 >
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
