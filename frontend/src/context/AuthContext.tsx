'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

interface AuthContextType {
 user: User | null;
 login: (token: string, user: User) => void;
 logout: () => void;
 updateUser: (user: User) => void;
 loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const storedUser = localStorage.getItem('user');
 const token = localStorage.getItem('token');
 if (storedUser && token) {
 setUser(JSON.parse(storedUser));
 }
 setLoading(false);
 }, []);

 const login = (token: string, user: User) => {
 localStorage.setItem('token', token);
 localStorage.setItem('user', JSON.stringify(user));
 setUser(user);
 };

 const logout = () => {
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 setUser(null);
 };

 const updateUser = (updatedUser: User) => {
 localStorage.setItem('user', JSON.stringify(updatedUser));
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
