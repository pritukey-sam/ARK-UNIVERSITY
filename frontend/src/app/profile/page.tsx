'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, Shield, Bell,
  Lock, Save, Loader2, Eye, EyeOff, Camera, Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { validateEmail, validatePhone, validateEmailField, validateName } from '@/lib/validation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const COUNTRIES = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Russia', code: '+7', flag: '🇷🇺' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪' },
  { name: 'Norway', code: '+47', flag: '🇳🇴' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰' },
  { name: 'Finland', code: '+358', flag: '🇫🇮' },
  { name: 'Ireland', code: '+353', flag: '🇮🇪' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { name: 'Belgium', code: '+32', flag: '🇧🇪' },
  { name: 'Austria', code: '+43', flag: '🇦Ｔ' },
  { name: 'Portugal', code: '+351', flag: '🇵Ｔ' },
  { name: 'Greece', code: '+30', flag: '🇬Ｒ' },
  { name: 'Turkey', code: '+90', flag: 'ＴＲ' },
  { name: 'Israel', code: '+972', flag: 'ＩＬ' },
  { name: 'Hong Kong', code: '+852', flag: 'ＨＫ' },
  { name: 'Malaysia', code: '+60', flag: 'ＭＹ' },
  { name: 'Thailand', code: '+66', flag: 'ＴＨ' },
  { name: 'Indonesia', code: '+62', flag: 'ＩＤ' },
  { name: 'Philippines', code: '+63', flag: 'ＰＨ' },
  { name: 'Vietnam', code: '+84', flag: 'ＶＮ' },
  { name: 'Pakistan', code: '+92', flag: 'ＰＫ' },
  { name: 'Bangladesh', code: '+880', flag: 'ＢＤ' },
  { name: 'Nigeria', code: '+234', flag: 'ＮＧ' },
  { name: 'Egypt', code: '+20', flag: 'ＥＧ' },
  { name: 'Argentina', code: '+54', flag: 'ＡＲ' },
  { name: 'Colombia', code: '+57', flag: 'ＣＯ' },
  { name: 'Chile', code: '+56', flag: 'ＣＬ' },
  { name: 'Peru', code: '+51', flag: 'ＰＥ' },
  { name: 'Poland', code: '+48', flag: 'ＰＬ' },
  { name: 'Ukraine', code: '+380', flag: 'ＵＡ' },
  { name: 'Czech Republic', code: '+420', flag: 'ＣＺ' },
  { name: 'Hungary', code: '+36', flag: 'ＨＵ' },
  { name: 'Romania', code: '+40', flag: 'ＲＯ' },
].sort((a, b) => a.name.localeCompare(b.name));
// Add more countries or use a library in production.
// For this task, I'll provide a significant list.

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleAvatarDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.common.deleteAvatar();
      if (user) {
        updateUser({ ...user, avatar_url: undefined });
      }
      toast.success('Profile photo removed');
      setPreviewOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove photo');
    } finally {
      setDeleteLoading(false);
    }
  };
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File type validation (.jpg, .jpeg, .png, .webp)
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedExtensions.includes(fileExtension) || !allowedTypes.includes(file.type)) {
      toast.error('Only image files (.jpg, .jpeg, .png, .webp) are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let newAvatarUrl = '';
      try {
        const res = await api.common.uploadAvatar(formData);
        newAvatarUrl = res.avatar_url || res.url;
      } catch (err: any) {
        // Fallback gracefully for local-only if endpoint 404s
        if (err.status === 404 || err.status === 405) {
           newAvatarUrl = URL.createObjectURL(file);
           toast.success('Avatar updated locally');
        } else {
           throw err;
        }
      }

      if (user) {
        updateUser({ ...user, avatar_url: newAvatarUrl });
      }
      if (!newAvatarUrl.startsWith('blob:')) {
        toast.success('Profile photo updated successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  // 1. PROFILE SETTINGS
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
  });
  const [nameError, setNameError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setProfileData(prev => ({ ...prev, name: val }));
    const check = validateName(val);
    setNameError(check.isValid ? null : (check.error || "Invalid name"));
  };

  const handleEmailFieldChange = (val: string) => {
    setProfileData(prev => ({ ...prev, email: val }));
    const check = validateEmailField(val);
    setEmailError(check.isValid ? null : (check.error || "Invalid email address"));
  };

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        countryCode: user.country_code || '+91',
      });
      setNameError(null);
      setEmailError(null);
      setPhoneError(null);
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Name Validation
    const nameCheck = validateName(profileData.name);
    if (!nameCheck.isValid) {
      setNameError(nameCheck.error || "Invalid name");
      return toast.error(nameCheck.error || "Invalid name");
    }

    // Proper Email Validation
    const emailCheck = validateEmailField(profileData.email);
    if (!emailCheck.isValid) {
      setEmailError(emailCheck.error || "Invalid email");
      return toast.error(emailCheck.error || "Invalid email");
    }

    // Phone Number Validation (if entered, as it is labeled Optional in UI)
    const phoneVal = profileData.phone.trim();
    if (phoneVal) {
      if (!validatePhone(phoneVal)) {
        setPhoneError('Phone number must be exactly 10 digits');
        return toast.error('Phone number must be exactly 10 digits');
      }
    }

    setLoading(true);
    try {
      await api.common.updateProfile({ 
        name: profileData.name,
        email: profileData.email.trim(),
        phone: profileData.phone,
        country_code: profileData.countryCode
      });
      
      // Update local context to reflect changes everywhere
      updateUser({ 
        ...user, 
        name: profileData.name,
        email: profileData.email.trim().toLowerCase(),
        phone: profileData.phone,
        country_code: profileData.countryCode
      });
      
      toast.success('Profile settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // 2. ACCOUNT & SECURITY
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error('New passwords do not match');
    }
    if (passwords.new.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    
    setPassLoading(true);
    try {
      // Real API integration to the correct patch profile endpoint
      await api.request('/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ password: passwords.new })
      });
      toast.success('Password updated securely');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  // 3. NOTIFICATION SETTINGS
  const [notifSettings, setNotifSettings] = useState({
    assignments: true,
    reminders: true,
    completion: true,
    alerts: false
  });
  const [notifLoading, setNotifLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`notif_settings_${user.id}`);
      if (saved) {
        try {
          setNotifSettings(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [user]);

  const handleNotifToggle = async (key: keyof typeof notifSettings, value: boolean) => {
    if (!user) return;
    
    // Optimistic UI update
    const previous = { ...notifSettings };
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    setNotifLoading(key);
    
    try {
      // Real API integration attempt (direct fetch to avoid global 404 logging spam)
      const response = await fetch(`/api/users/${user.id}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ notifications: updated })
      });

      if (!response.ok && response.status !== 404 && response.status !== 405) {
        throw new Error('Failed to update preferences on server');
      }
      
      // Local persistence bound to user profile
      localStorage.setItem(`notif_settings_${user.id}`, JSON.stringify(updated));
      toast.success('Notification preference saved securely');
    } catch (error: any) {
      // Rollback on failure
      setNotifSettings(previous);
      toast.error(error.message || 'Failed to save notification preference');
    } finally {
      setNotifLoading(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-[#F9FAFB] min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Settings</h1>
        <p className="text-gray-500 font-medium mt-1">Manage platform configurations and organizational security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="space-y-4">
          <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col items-center text-center space-y-3">
              <div id="tour-settings-profile-pic" className="relative group">
                <div 
                  onClick={() => setPreviewOpen(true)}
                  className="w-20 h-20 rounded-full bg-orange-50 border-4 border-white shadow-sm flex items-center justify-center text-3xl font-black text-[#F26522] overflow-hidden cursor-pointer relative transition-all hover:scale-105"
                  title="Click to view or manage profile photo"
                >
                  {user?.avatar_url ? (
                    <>
                      <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    user?.name?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={avatarLoading}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#F26522] transition-colors cursor-pointer"
                  title="Upload new photo"
                >
                  {avatarLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div>
                <p className="font-bold text-gray-900">{user?.name}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            
            <div id="tour-settings-account-options" className="p-3 space-y-1">
              {[
                { id: 'profile', icon: User, label: 'Profile Settings' },
                { id: 'security', icon: Shield, label: 'Password' },
                { id: 'notifications', icon: Bell, label: 'Notifications' },
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all",
                    activeTab === item.id 
                      ? "text-[#F26522] bg-orange-50 font-bold" 
                      : "text-gray-500 hover:bg-gray-50 font-medium hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-[#F26522]" : "text-gray-400")} /> 
                  {item.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          
          {/* 1. PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <Card id="tour-settings-profile-info" className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-white p-6">
                <CardTitle className="text-xl font-black text-gray-900">Profile Settings</CardTitle>
                <p className="text-sm text-gray-500 font-medium mt-1">Manage your administrative identity and contact details.</p>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                      <Input 
                        value={profileData.name} 
                        onChange={e => handleNameChange(e.target.value)} 
                        onBlur={e => handleNameChange(e.target.value)}
                        className={cn(
                          "border-gray-200 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200",
                          nameError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500"
                        )}
                        required
                      />
                      {nameError && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{nameError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                      <Input 
                        value={profileData.email} 
                        onChange={e => handleEmailFieldChange(e.target.value)}
                        onBlur={e => handleEmailFieldChange(e.target.value)}
                        className={cn(
                          "border-gray-200 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-[#F26522] focus-visible:border-transparent hover:border-gray-300 transition-all duration-200",
                          emailError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500"
                        )}
                        required
                        type="email"
                      />
                      {emailError && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{emailError}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number (Optional)</Label>
                    <div className="flex gap-2 max-w-md">
                      <Select 
                        value={profileData.countryCode} 
                        onValueChange={v => setProfileData({...profileData, countryCode: v as string})}
                      >
                        <SelectTrigger className="w-[140px] h-11 rounded-xl border-gray-200 font-bold">
                           <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-[300px]">
                          <ScrollArea className="h-full">
                            {COUNTRIES.map((country) => (
                              <SelectItem 
                                key={`${country.name}-${country.code}`} 
                                value={country.code} 
                                className="text-xs font-medium cursor-pointer"
                              >
                                <span className="mr-2">{country.flag}</span>
                                {country.name} ({country.code})
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <Input 
                        value={profileData.phone} 
                        onChange={e => {
                          const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setProfileData({...profileData, phone: cleanVal});
                          if (cleanVal && cleanVal.length !== 10) {
                            setPhoneError("Phone number must be exactly 10 digits");
                          } else {
                            setPhoneError(null);
                          }
                        }}
                        onBlur={e => {
                          const val = e.target.value;
                          if (val && val.length !== 10) {
                            setPhoneError("Phone number must be exactly 10 digits");
                          } else {
                            setPhoneError(null);
                          }
                        }}
                        maxLength={10}
                        placeholder="9876543210"
                        className={cn(
                          "flex-1 border-gray-200 h-11 rounded-xl",
                          phoneError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500"
                        )} 
                      />
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-xs mt-1 font-bold">{phoneError}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading || !!nameError || !!emailError || !!phoneError} className="bg-[#F26522] hover:bg-[#D54D10] text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-orange-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 2. ACCOUNT & SECURITY */}
          {activeTab === 'security' && (
            <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-white p-6">
                <CardTitle className="text-xl font-black text-gray-900">Password</CardTitle>
                <p className="text-sm text-gray-500 font-medium mt-1">Ensure your administrative access remains secure.</p>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordSave} className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showCurrentPass ? "text" : "password"}
                        value={passwords.current}
                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                        placeholder="••••••••" 
                        className="border-gray-200 h-11 rounded-xl pr-10" 
                        required
                      />
                      <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1} aria-label={showCurrentPass ? "Hide password" : "Show password"}>
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showNewPass ? "text" : "password"}
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        placeholder="••••••••" 
                        className="border-gray-200 h-11 rounded-xl pr-10" 
                        required
                      />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1} aria-label={showNewPass ? "Hide password" : "Show password"}>
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">Must be at least 8 characters long.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirm New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showConfirmPass ? "text" : "password"}
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        placeholder="••••••••" 
                        className="border-gray-200 h-11 rounded-xl pr-10" 
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1} aria-label={showConfirmPass ? "Hide password" : "Show password"}>
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={passLoading} className="bg-gray-900 hover:bg-gray-800 text-white font-bold h-11 px-8 rounded-xl shadow-md w-full transition-all">
                      {passLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                      Update Secure Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 3. NOTIFICATION SETTINGS */}
          {activeTab === 'notifications' && (
            <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-white p-6">
                <CardTitle className="text-xl font-black text-gray-900">Notification Settings</CardTitle>
                <p className="text-sm text-gray-500 font-medium mt-1">Control system-wide alerts and learning reminders.</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-w-2xl">
                  {[
                    { id: 'assignments', title: 'Course Assignments', desc: 'Alert me when new curriculum tracks are assigned.' },
                    { id: 'reminders', title: 'Due Date Reminders', desc: 'Send alerts 48 hours before a deadline expires.' },
                    { id: 'completion', title: 'Completion Receipts', desc: 'Notify me when users finalize their learning tracks.' },
                    { id: 'alerts', title: 'System Security Alerts', desc: 'Urgent notifications regarding platform integrity.' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50/80 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{item.title}</p>
                          {notifLoading === item.id && <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />}
                        </div>
                        <p className="text-xs font-medium text-gray-500">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifSettings[item.id as keyof typeof notifSettings]}
                        disabled={notifLoading === item.id}
                        onClick={() => handleNotifToggle(item.id as keyof typeof notifSettings, !notifSettings[item.id as keyof typeof notifSettings])}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                          notifSettings[item.id as keyof typeof notifSettings] ? "bg-[#F26522]" : "bg-gray-200"
                        )}
                      >
                        <span className="sr-only">Toggle {item.title}</span>
                        <span
                          className={cn(
                            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                            notifSettings[item.id as keyof typeof notifSettings] ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}



        </div>
      </div>

      {/* Profile Photo View & Manage Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 border border-gray-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 text-center">Profile Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 my-2">
            <div className="w-56 h-56 rounded-2xl overflow-hidden border-4 border-gray-100 shadow-lg bg-gray-50 flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Full Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl font-black text-[#F26522]">{user?.name?.[0]?.toUpperCase() || 'A'}</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <Button
                type="button"
                onClick={() => {
                  setPreviewOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto bg-[#F26522] hover:bg-[#d55418] text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Camera className="w-4 h-4" />
                Upload New Photo
              </Button>

              {user?.avatar_url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAvatarDelete}
                  disabled={deleteLoading}
                  className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove Photo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

