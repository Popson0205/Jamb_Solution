import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

export async function fetchWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isNetworkError = !err.response;
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
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const interceptorRef = useRef<number | null>(null);

  // Register axios interceptor once on mount
  useEffect(() => {
    // Remove any existing interceptor
    if (interceptorRef.current !== null) {
      axios.interceptors.request.eject(interceptorRef.current);
    }

    interceptorRef.current = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem('jamb_admin_token');
      if (t) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${t}`;
      }
      return config;
    });

    // Restore session from localStorage
    const storedToken = localStorage.getItem('jamb_admin_token');
    const storedUser = safeParseJSON(localStorage.getItem('jamb_admin_user'));

    if (storedToken && storedUser) {
      // Validate token is not expired by checking payload
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const isExpired = payload.exp && payload.exp * 1000 < Date.now();
        if (!isExpired) {
          setToken(storedToken);
          setUser(storedUser);
        } else {
          // Token expired — clear storage
          localStorage.removeItem('jamb_admin_token');
          localStorage.removeItem('jamb_admin_user');
        }
      } catch {
        // Invalid token format — clear
        localStorage.removeItem('jamb_admin_token');
        localStorage.removeItem('jamb_admin_user');
      }
    }

    setReady(true);

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/admin/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('jamb_admin_token', newToken);
    localStorage.setItem('jamb_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('jamb_admin_token');
    localStorage.removeItem('jamb_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
