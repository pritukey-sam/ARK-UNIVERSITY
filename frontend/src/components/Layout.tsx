'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  LayoutDashboard, BookOpen, Users, Settings, 
  LogOut, Bell, Search, Menu, X,
  User, ChevronDown, Building2, Activity,
  PanelLeftClose, PanelLeftOpen, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { toast } from 'sonner';
import BackButton from '@/components/common/BackButton';

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
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isStaff = isAdmin || user?.role === 'hr';

  useEffect(() => {
    // Load collapse state from local storage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) setIsCollapsed(savedState === 'true');

    if (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr') {
      fetchPending();
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const fetchPending = async () => {
    try {
      let data: any[] = [];
      if (user?.role === 'super_admin') {
        data = await api.superAdmin.getRegistrationRequests();
      } else if (user?.role === 'admin' || user?.role === 'hr') {
        data = await api.assignments.getPending();
      }
      setPendingItems(data);
      setPendingCount(data.length);
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

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'employee', 'hr'] },
    { label: 'Super Admin', icon: Activity, path: '/super-admin', roles: ['super_admin'] },
    { label: 'Courses', icon: BookOpen, path: '/courses', roles: ['admin', 'employee', 'hr'] },
    { label: 'Companies', icon: Building2, path: '/super-admin/companies', roles: ['super_admin'] },
    { label: 'Users', icon: Users, path: '/users', roles: ['admin', 'hr'] },
    { label: 'Assignments', icon: FileText, path: '/assignments', roles: ['hr', 'admin'] },
    { label: 'Settings', icon: Settings, path: '/profile', roles: ['super_admin', 'admin', 'employee', 'hr'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-[#eee] bg-white transition-all duration-300 ease-in-out h-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 border-b border-[#eee] flex items-center transition-all duration-300", isCollapsed ? "justify-center px-4" : "justify-between")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-[#F26522] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            {!isCollapsed && <span className="text-xl font-bold text-[#111] whitespace-nowrap">Lumina LMS</span>}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              title={isCollapsed ? item.label : ""}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.path 
                  ? "bg-[#F26522]/10 text-[#F26522]" 
                  : "text-[#6A6F73] hover:bg-gray-50 hover:text-[#111]",
                isCollapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-[#eee]">
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors",
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
              <SheetContent side="left" className="p-0 w-64">
                <div className="p-6 border-b border-[#eee]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#F26522] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">L</span>
                    </div>
                    <span className="text-xl font-bold text-[#111]">Lumina LMS</span>
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
                          ? "bg-[#F26522]/10 text-[#F26522]" 
                          : "text-[#6A6F73] hover:bg-gray-50 hover:text-[#111]"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-4 pt-4 border-t border-[#eee]"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden lg:flex text-[#6A6F73] hover:text-[#111]" 
              onClick={toggleSidebar}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </Button>

            <BackButton />
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
                <div className="absolute top-full mt-1 left-0 w-full bg-white border border-[#eee] rounded-lg shadow-lg z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-4 text-center text-sm text-[#6A6F73]">Searching...</div>
                  ) : searchResults?.courses.length > 0 ? (
                    searchResults.courses.map((c: any) => (
                      <button 
                        key={c.id} 
                        onClick={() => { router.push(`/courses/${c.id}`); setSearchOpen(false); setSearchQuery(''); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#eee] last:border-0"
                      >
                        <p className="font-bold text-[#111]">{c.title}</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-[#6A6F73]">No results found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6A6F73] hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#F26522] rounded-full border border-white" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute top-full mt-1 right-0 w-80 bg-white border border-[#eee] rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-[#eee]">
                    <p className="font-bold text-sm">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {pendingItems.length > 0 ? (
                      pendingItems.map((item: any, i: number) => (
                        <div key={i} className="p-4 border-b border-[#eee] last:border-0 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setNotifOpen(false);
                            if (user?.role === 'super_admin') router.push('/super-admin');
                            else router.push('/dashboard');
                          }}>
                          <p className="text-sm font-bold text-[#111]">{item.company_name || item.user_name}</p>
                          <p className="text-xs text-[#6A6F73] mt-1 line-clamp-1">Pending approval</p>
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
                <div className="w-8 h-8 rounded-full bg-[#F26522] flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-[#6A6F73] transition-transform", profileOpen && "rotate-180")} />
              </button>
              {profileOpen && (
                <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-[#eee] rounded-lg shadow-lg z-50 py-1">
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
    </div>
  );
}
