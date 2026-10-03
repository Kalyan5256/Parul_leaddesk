import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export type UserRole = 'employee' | 'team_lead' | 'manager' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  team: string | null;
  phone: string | null;
  is_active: boolean;
  must_change_password?: boolean;
  password_reset_at?: string | null;
  password_reset_by?: string | null;
  created_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<UserProfile>;
  logout: () => void;
  updateCurrentUserProfile: (profile: Partial<UserProfile>) => void;
  isEmployee: boolean;
  isTeamLead: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('parul_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('parul_auth_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/me');
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('parul_user', JSON.stringify(res.user));
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = async (username: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      if (!res.success || !res.token) {
        throw new Error(res.message || 'Login failed');
      }

      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('parul_auth_token', res.token);
      localStorage.setItem('parul_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('parul_auth_token');
    localStorage.removeItem('parul_user');
  };

  const updateCurrentUserProfile = (profile: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...profile };
      setUser(updated);
      localStorage.setItem('parul_user', JSON.stringify(updated));
    }
  };

  const role = user?.role;
  const isEmployee = role === 'employee';
  const isTeamLead = false;
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        logout,
        updateCurrentUserProfile,
        isEmployee,
        isTeamLead,
        isManager,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
