import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getToken, setToken } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (t) {
      setTokenState(t);
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload.sub && payload.email) {
          setUser({ id: payload.sub, email: payload.email, name: null });
        }
      } catch {
        setToken(null);
        setTokenState(null);
        setUser(null);
      }
    }
    setIsReady(true);
  }, []);

  const setAuth = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, setAuth, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
