import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function safeParseJSON(value: string | null): any {
  if (!value || value === 'undefined' || value === 'null') return null;
  try { return JSON.parse(value); } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('jamb_admin_token') || null
  );
  const [user, setUser] = useState<any>(
    safeParseJSON(localStorage.getItem('jamb_admin_user'))
  );

  // ── Attach token to every request via interceptor (survives re-renders)
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem('jamb_admin_token');
      if (t) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${t}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // ── Handle 401 responses — auto logout
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          // Token expired or invalid — clear and redirect to login
          localStorage.removeItem('jamb_admin_token');
          localStorage.removeItem('jamb_admin_user');
          setToken(null);
          setUser(null);
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/admin/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('jamb_admin_token', newToken);
    localStorage.setItem('jamb_admin_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('jamb_admin_token');
    localStorage.removeItem('jamb_admin_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
