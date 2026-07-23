'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { validateEmail } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val.trim()) {
      setEmailError("Email address is required");
    } else if (!validateEmail(val)) {
      setEmailError("Invalid email address");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email.trim())) {
      setEmailError("Invalid email address");
      return toast.error("Invalid email address");
    }
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email });
      setSuccess(true);
      toast.success('Reset email requested');
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f5] bg-gradient-to-br from-[#fffdfb] via-[#fff5f0] to-[#ffebd9] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F26522]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F26522]/15 rounded-full blur-3xl" />

      <div className="w-full max-w-lg bg-white rounded-[32px] border border-white/60 shadow-2xl overflow-hidden p-8 lg:p-12 z-10 relative">
        {!success ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-xs font-bold text-[#F26522] border border-orange-100">
                <KeyRound className="w-4 h-4" /> Password Recovery
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">Forgot Password?</h2>
              <p className="text-[#6A6F73] text-sm font-medium leading-relaxed">
                Enter your registered corporate email below, and we will send you a secure, single-use link to reset your password.
              </p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                    <div className="relative group">
                      <Mail className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#F26522] transition-colors", emailError && "text-red-500")} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={(e) => handleEmailChange(e.target.value)}
                        required
                        className={cn(
                          "pl-12 h-12 border-gray-200 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl text-sm transition-all bg-gray-50/30 focus:bg-white",
                          emailError && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                      />
                    </div>
                    {emailError && <p className="text-red-500 text-xs font-bold mt-1">{emailError}</p>}
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white h-12 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl shadow-orange-500/15 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !!emailError}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Request Secure Reset Link'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Back to Login Link */}
            <div className="text-center pt-2">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#F26522] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Log In
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#111] tracking-tight">Reset Link Sent!</h2>
              <p className="text-[#6A6F73] text-sm font-medium leading-relaxed max-w-sm mx-auto">
                If the email address <strong className="text-[#111]">{email}</strong> exists in our system, a secure password reset link has been dispatched to it.
              </p>
            </div>
            
            <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs text-left max-w-sm mx-auto space-y-1">
              <strong>Check your spam folder:</strong> If you do not see the email in your inbox within 2 minutes, please verify your spam or junk directory.
            </div>

            <Button 
              onClick={() => router.push('/login')} 
              className="bg-[#F26522] hover:bg-[#D54D10] text-white h-11 px-8 rounded-xl font-bold transition-all shadow-md shadow-orange-500/10 text-sm"
            >
              Return to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
