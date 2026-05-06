import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface AuthContextType { token: string | null; user: any; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jamb_admin_token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('jamb_admin_user') || 'null'));

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/admin/auth/login', { email, password });
    setToken(res.data.token); setUser(res.data.user);
    localStorage.setItem('jamb_admin_token', res.data.token);
    localStorage.setItem('jamb_admin_user', JSON.stringify(res.data.user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem('jamb_admin_token'); localStorage.removeItem('jamb_admin_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
