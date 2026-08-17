'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  LayoutDashboard, BookOpen, Users, Settings, 
  LogOut, Bell, Search, Menu, X,
  User, ChevronDown, Building2, Activity,
  PanelLeftClose, PanelLeftOpen, FileText, History, Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { toast } from 'sonner';
import OnboardingTour from './OnboardingTour';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isStaff = isAdmin || user?.role === 'hr';

  useEffect(() => {
    // Load collapse state from local storage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) setIsCollapsed(savedState === 'true');

    let interval: any;
    if (user && (user.role === 'admin' || user.role === 'hr')) {
      fetchNotifications();
      interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const fetchNotifications = async () => {
    if (!user) {
      return;
    }
    try {
      const data = await api.notifications.getAll();
      setNotifications(data);
      const countData = await api.notifications.getUnreadCount();
      setUnreadCount(countData.unread_count);
    } catch (e) { console.error(e); }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.is_read) {
        await api.notifications.markAsRead(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      }
      setNotifOpen(false);
      if (notif.route) {
        router.push(notif.route);
      }
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const results = await api.common.search(q);
      setSearchResults(results);
    } catch (e) { console.error(e); }
    finally { setSearchLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
    toast.success('Logged out successfully');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'employee', 'hr'] },
    { label: 'Courses', icon: BookOpen, path: '/courses', roles: ['admin', 'employee', 'hr'] },
    { label: 'Users', icon: Users, path: '/users', roles: ['admin', 'hr'] },
    { label: 'Assigned Courses', icon: FileText, path: '/assignments', roles: ['hr', 'admin'] },
    { label: 'Course Requests', icon: Bookmark, path: '/course-requests', roles: ['admin'] },
    { label: 'Audit Log', icon: History, path: '/audit-log', roles: ['admin'] },
    { label: 'Settings', icon: Settings, path: '/profile', roles: ['admin', 'employee', 'hr'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-[rgba(255,255,255,0.1)] bg-[#2D3250] transition-all duration-300 ease-in-out h-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 border-b border-[rgba(255,255,255,0.1)] flex items-center transition-all duration-300", isCollapsed ? "flex-col gap-4 justify-center px-4" : "justify-between")}>
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 mr-2">
            <img 
              src="/ark-simplify-logo.png" 
              alt="ARK Simplify Logo" 
              className="h-[36px] w-auto object-contain shrink-0" 
            />
            {!isCollapsed && (
              <div className="marquee-container whitespace-nowrap">
                <div className="animate-marquee whitespace-nowrap">
                  <span className="text-xl font-bold text-white pr-4 whitespace-nowrap shrink-0">ARK University</span>
                  <span className="text-xl font-bold text-white pr-4 whitespace-nowrap shrink-0">ARK University</span>
                </div>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/60 hover:text-white hover:bg-[#3D4F8A]" 
            onClick={toggleSidebar}
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </Button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              id={`tour-sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              title={isCollapsed ? item.label : ""}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.path 
                  ? "bg-[#F26522] text-white font-semibold animate-in fade-in duration-200" 
                  : "text-white/90 hover:bg-[#3D4F8A] hover:text-white",
                isCollapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-[rgba(255,255,255,0.1)]">
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-[#3D4F8A] hover:text-white transition-colors",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Sign Out" : ""}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-[#eee] bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger 
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden text-[#111]">
                    <Menu className="w-6 h-6" />
                  </Button>
                }
              />
              <SheetContent side="left" className="p-0 w-64 bg-[#2D3250] border-r border-[rgba(255,255,255,0.1)] text-white [&>button]:text-white [&>button]:hover:bg-[#3D4F8A]">
                <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-3 w-full overflow-hidden">
                    <img 
                      src="/ark-simplify-logo.png" 
                      alt="ARK Simplify Logo" 
                      className="h-[36px] w-auto object-contain shrink-0" 
                    />
                    <div className="marquee-container whitespace-nowrap">
                      <div className="animate-marquee whitespace-nowrap">
                        <span className="text-xl font-bold text-white pr-4 whitespace-nowrap shrink-0">ARK University</span>
                        <span className="text-xl font-bold text-white pr-4 whitespace-nowrap shrink-0">ARK University</span>
                      </div>
                    </div>
                  </div>
                </div>
                <nav className="p-4 space-y-1">
                  {filteredNav.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        pathname === item.path 
                          ? "bg-[#F26522] text-white font-semibold" 
                          : "text-white/90 hover:bg-[#3D4F8A] hover:text-white"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-[#3D4F8A] hover:text-white transition-colors mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>

          </div>

          <div className="flex-1 max-w-md mx-4">
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search resources, courses, users..."
                className="w-full bg-gray-50/50 border border-[#eee] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#F26522] transition-colors"
              />
              {searchOpen && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white border border-[#eee] rounded-xl shadow-xl z-[200] overflow-hidden max-h-[450px] overflow-y-auto custom-scrollbar">
                  {searchLoading ? (
                    <div className="p-4 text-center text-sm text-[#6A6F73]">Searching...</div>
                  ) : ((searchResults?.courses?.length > 0) || (searchResults?.modules?.length > 0) || (searchResults?.users?.length > 0)) ? (
                    <div className="divide-y divide-[#eee]">
                      {/* Courses */}
                      {searchResults?.courses?.length > 0 && (
                        <div className="p-2">
                          <p className="px-3 py-1.5 text-[10px] font-bold text-[#6A6F73] uppercase tracking-wider">Courses</p>
                          <div className="space-y-0.5">
                            {searchResults.courses.map((c: any) => (
                              <button 
                                key={`course-${c.id}`} 
                                onClick={() => { router.push(`/courses/${c.id}`); setSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[#F26522]/5 rounded-lg transition-colors flex items-center gap-3"
                              >
                                <BookOpen className="w-4 h-4 text-[#F26522] shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-[#111] truncate">{c.title}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Modules */}
                      {searchResults?.modules?.length > 0 && (
                        <div className="p-2">
                          <p className="px-3 py-1.5 text-[10px] font-bold text-[#6A6F73] uppercase tracking-wider">Modules</p>
                          <div className="space-y-0.5">
                            {searchResults.modules.map((m: any) => (
                              <button 
                                key={`module-${m.id}`} 
                                onClick={() => { router.push(`/courses/${m.course_id}/modules/${m.id}`); setSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[#F26522]/5 rounded-lg transition-colors flex items-center gap-3"
                              >
                                <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-[#111] truncate">{m.title}</p>
                                  <p className="text-[10px] text-[#6A6F73] truncate">Module ID: {m.id}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Users */}
                      {searchResults?.users?.length > 0 && (
                        <div className="p-2">
                          <p className="px-3 py-1.5 text-[10px] font-bold text-[#6A6F73] uppercase tracking-wider">Users & HR</p>
                          <div className="space-y-0.5">
                            {searchResults.users.map((u: any) => (
                              <button 
                                key={`user-${u.id}`} 
                                onClick={() => { router.push(`/users/${u.id}`); setSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[#F26522]/5 rounded-lg transition-colors flex items-start gap-3"
                              >
                                <div className="w-7 h-7 rounded-full bg-[#F26522]/10 text-[#F26522] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 overflow-hidden">
                                  {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                    u.name?.[0]?.toUpperCase() || '?'
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-[#111] truncate">{u.name}</p>
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-[#6A6F73] border border-gray-200 shrink-0 capitalize">{u.role}</span>
                                  </div>
                                  <p className="text-[10px] text-[#6A6F73] truncate">{u.email} • ID: {u.employee_id || 'N/A'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-[#6A6F73]">
                      No resources, courses, modules or users found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6A6F73] hover:bg-gray-50 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#F26522] text-white text-[10px] font-bold rounded-full border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute top-full mt-1 right-0 w-80 bg-white border border-[#eee] rounded-lg shadow-lg z-[200]">
                  <div className="p-4 border-b border-[#eee]">
                    <p className="font-bold text-sm">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((item: any, i: number) => (
                        <div key={item.id} 
                          className={cn(
                            "p-4 border-b border-[#eee] last:border-0 hover:bg-gray-50 cursor-pointer transition-colors",
                            !item.is_read && "bg-blue-50/30 hover:bg-blue-50/50"
                          )}
                          onClick={() => handleNotificationClick(item)}>
                          <p className={cn("text-sm text-[#111]", !item.is_read && "font-bold")}>{item.title}</p>
                          <p className="text-xs text-[#6A6F73] mt-1 line-clamp-2">{item.message}</p>
                          <p className="text-[10px] text-[#A1A7AF] mt-2">
                            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-sm text-[#6A6F73]">No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#F26522] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-[#6A6F73] transition-transform", profileOpen && "rotate-180")} />
              </button>
              {profileOpen && (
                <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-[#eee] rounded-lg shadow-lg z-[200] py-1">
                  <button onClick={() => router.push('/profile')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-[#6A6F73]">Profile</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 border-t border-[#eee]">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
