'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'hr' | 'employee';
  company_id?: number;
  company_name?: string;
  employee_id?: string;
  plan_type?: 'free' | 'paid';
  plan_price?: number;
  payment_status?: 'pending' | 'completed';
  avatar_url?: string;
  is_first_login?: boolean;
  phone?: string;
  country_code?: string;
}

interface AuthContextType {
 user: User | null;
 login: (user: User) => void;
 logout: () => Promise<void>;
 updateUser: (user: User) => void;
 loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const freshUser = await api.common.getProfile();
        setUser(freshUser);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

 const login = (user: User) => {
   setUser(user);
 };

 const logout = async () => {
   try {
     await api.auth.logout();
   } catch (e) {
     console.error('Failed to log out from server', e);
   }
   setUser(null);
   if (typeof window !== 'undefined') {
     window.history.replaceState(null, '', '/login');
   }
 };

 const updateUser = (updatedUser: User) => {
   setUser(updatedUser);
 };

 return (
 <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
 {children}
 </AuthContext.Provider>
 );
};

export const useAuth = () => {
 const context = useContext(AuthContext);
 if (context === undefined) {
 throw new Error('useAuth must be used within an AuthProvider');
 }
 return context;
};
