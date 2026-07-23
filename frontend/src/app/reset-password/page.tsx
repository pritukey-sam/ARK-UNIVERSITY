'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, KeyRound, Check, CheckCircle2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  // Secure password requirement checks
  const meetsLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Reset token is missing. Please request a new link.');
      return;
    }

    if (!meetsLength || !hasLetter || !hasNumber) {
      toast.error('Password does not meet the security requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 border border-red-100 rounded-full flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#111] tracking-tight">Invalid Reset Link</h2>
          <p className="text-[#6A6F73] text-sm font-medium leading-relaxed max-w-sm mx-auto">
            The password reset token is missing or invalid. Please check your email link or request a new reset email.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/forgot-password')} 
          className="bg-[#F26522] hover:bg-[#D54D10] text-white h-11 px-8 rounded-xl font-bold transition-all shadow-md text-sm"
        >
          Request New Link
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-16 h-16 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#111] tracking-tight">Password Reset Complete!</h2>
          <p className="text-[#6A6F73] text-sm font-medium leading-relaxed max-w-sm mx-auto">
            Your password has been securely updated. You can now use your new credentials to log in.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/login')} 
          className="bg-[#F26522] hover:bg-[#D54D10] text-white h-11 px-8 rounded-xl font-bold transition-all shadow-md text-sm"
        >
          Proceed to Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-xs font-bold text-[#F26522] border border-orange-100">
          <KeyRound className="w-4 h-4" /> Secure Reset Page
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">Reset Password</h2>
        <p className="text-[#6A6F73] text-sm font-medium leading-relaxed">
          Set a secure new password for your ARK University LMS account.
        </p>
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-wider text-gray-500">New Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#F26522] transition-colors z-10" />
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pl-12 pr-12 h-12 border-gray-200 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-[#F26522] transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm New Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#F26522] transition-colors z-10" />
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-12 pr-12 h-12 border-gray-200 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-[#F26522] transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Secure Password Requirements HUD */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password Requirements</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${meetsLength ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-[#F26522]'}`}>
                    {meetsLength ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#F26522]" />}
                  </div>
                  <span className={meetsLength ? 'text-green-700 font-medium' : 'text-gray-500'}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasLetter ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-[#F26522]'}`}>
                    {hasLetter ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#F26522]" />}
                  </div>
                  <span className={hasLetter ? 'text-green-700 font-medium' : 'text-gray-500'}>Contains a letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-[#F26522]'}`}>
                    {hasNumber ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#F26522]" />}
                  </div>
                  <span className={hasNumber ? 'text-green-700 font-medium' : 'text-gray-500'}>Contains a number</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${confirmPassword && newPassword === confirmPassword ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-[#F26522]'}`}>
                    {confirmPassword && newPassword === confirmPassword ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#F26522]" />}
                  </div>
                  <span className={confirmPassword && newPassword === confirmPassword ? 'text-green-700 font-medium' : 'text-gray-500'}>Passwords match</span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button 
              type="submit" 
              className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white h-12 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl shadow-orange-500/15 flex items-center justify-center gap-2 text-sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Save Security Settings'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#fff8f5] bg-gradient-to-br from-[#fffdfb] via-[#fff5f0] to-[#ffebd9] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F26522]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F26522]/15 rounded-full blur-3xl" />

      <div className="w-full max-w-lg bg-white rounded-[32px] border border-white/60 shadow-2xl overflow-hidden p-8 lg:p-12 z-10 relative">
        <Suspense fallback={
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-[#F26522] animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
