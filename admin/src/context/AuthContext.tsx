import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  user: any;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function safeParseJSON(value: string | null): any {
  if (!value || value === 'undefined' || value === 'null') return null;
  try { return JSON.parse(value); } catch { return null; }
}

// Retry wrapper — retries up to 3 times with 2s delay between attempts
// Handles cold-start CORS failures gracefully
export async function fetchWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isNetworkError = !err.response; // CORS/network errors have no response
      const isServerError = err.response?.status >= 500;
      if ((isNetworkError || isServerError) && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('jamb_admin_token') || null
  );
  const [user, setUser] = useState<any>(
    safeParseJSON(localStorage.getItem('jamb_admin_user'))
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem('jamb_admin_token');
      if (t) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${t}`;
      }
      return config;
    });
    setReady(true);
    return () => axios.interceptors.request.eject(reqInterceptor);
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
    <AuthContext.Provider value={{ token, user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
