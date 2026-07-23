'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Bookmark, Clock, CheckCircle2, XCircle, Calendar, AlertCircle, FileText, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CourseRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  
  // Confirmation states
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getCourseAccessRequests();
      // Exclude fulfilled requests
      const activeRequests = (data || []).filter((r: any) => r.status !== 'fulfilled');
      setRequests(activeRequests);
    } catch (error: any) {
      console.error("Failed to fetch course requests", error);
      toast.error(error.message || "Failed to load course requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }
      fetchRequests();
    }
  }, [user, authLoading, router]);

  const handleAction = async () => {
    if (!processingId || !confirmAction) return;

    setSubmitting(true);
    try {
      if (confirmAction === 'approve') {
        await api.admin.approveCourseAccessRequest(processingId);
        toast.success("Access request approved successfully!");
      } else {
        await api.admin.rejectCourseAccessRequest(processingId);
        toast.success("Access request rejected successfully!");
      }
      setProcessingId(null);
      setConfirmAction(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${confirmAction} request`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToAssign = (req: any) => {
    router.push(`/assignments?userId=${req.user_id}&courseId=${req.course_id}&assign=true`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#F26522]" />
        <p className="text-[#6A6F73] font-medium">Checking authorization...</p>
      </div>
    );
  }

  const filteredRequests = requests.filter(req => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return req.status === 'pending';
    if (filter === 'Approved') return req.status === 'approved';
    if (filter === 'Rejected') return req.status === 'rejected';
    return true;
  });

  return (
    <div className="p-8 max-w-full mx-auto space-y-8 bg-[#f8f9fa] min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111] tracking-tight">Course Requests</h1>
          <p className="text-[#6A6F73] mt-2 text-sm font-medium">
            Review and manage employee-initiated course access requests.
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-[#eee] shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-[#eee] bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => {
              const count = f === 'All' ? requests.length : requests.filter(r => r.status === f.toLowerCase()).length;
              const label = f === 'Approved' ? 'Approved Awaiting Assignment' : f;
              return (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs font-bold h-8 rounded-full px-4",
                    filter === f ? "bg-gray-900 text-white hover:bg-gray-800 border-none" : "text-[#6A6F73] border-[#eee] hover:bg-gray-50"
                  )}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eee] bg-gray-50/50">
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Employee ID</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Requested Course</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Request Date</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-[11px] font-bold text-[#6A6F73] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {filteredRequests.map(req => {
                return (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-[#111]">{req.user_name}</p>
                      <p className="text-xs text-[#6A6F73]">{req.user_email}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#111] font-medium">
                      {req.employee_id || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-[#111]">{req.course_title}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#111] font-medium">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <Badge variant="outline" className={cn(
                          "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                          req.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          req.status === 'approved' ? "bg-green-50 text-green-700 border-green-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {req.status === 'pending' && <Clock className="w-3 h-3 mr-1 inline-block" />}
                          {req.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1 inline-block" />}
                          {req.status === 'rejected' && <XCircle className="w-3 h-3 mr-1 inline-block" />}
                          {req.status === 'approved' ? 'Approved Awaiting Assignment' : req.status}
                        </Badge>
                        {req.reviewed_at && (
                          <p className="text-[10px] text-[#6A6F73]" title={formatDateTime(req.reviewed_at)}>
                            {req.status === 'approved' ? 'Approved' : 'Rejected'} {formatDate(req.reviewed_at)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setProcessingId(req.id);
                              setConfirmAction('approve');
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white shadow-sm h-8 px-3 text-xs font-bold"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setProcessingId(req.id);
                              setConfirmAction('reject');
                            }}
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs font-bold"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : req.status === 'approved' ? (
                        <Button
                          size="sm"
                          onClick={() => handleGoToAssign(req)}
                          className="bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm h-8 px-3 text-xs font-bold flex items-center gap-1.5 ml-auto"
                        >
                          Go To Assign Course <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <span className="text-xs text-[#6A6F73] font-medium italic">No action required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6A6F73]">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No course requests found for this filter</p>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6A6F73]">
                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#F26522]" />
                    <p className="text-sm font-medium">Loading requests...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={processingId !== null} onOpenChange={(open) => !open && setProcessingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="capitalize">{confirmAction} Course Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmAction} this course access request?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => setProcessingId(null)} disabled={submitting}>Cancel</Button>
            <Button 
              className={cn(confirmAction === 'approve' ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white")}
              onClick={handleAction} 
              disabled={submitting}
            >
              {submitting ? "Processing..." : `Confirm ${confirmAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
