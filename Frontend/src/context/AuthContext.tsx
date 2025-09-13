import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // ✅ NEW
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  isLoading: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Try to restore user from localStorage on initial load
    try {
      const savedUser = localStorage.getItem('cityLibraryUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Failed to restore user from localStorage:', error);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NEW FUNCTION: Refresh user session via /auth/refresh
  const refreshUser = async () => {
    try {
      const response = await axios.get('/api/auth/refresh', { withCredentials: true });
      const refreshedUser = response.data.user;
      refreshedUser.permissions = refreshedUser.permissions || [];
      setUser(refreshedUser);
      console.log('[AuthContext] Session refreshed:', refreshedUser);
    } catch (err) {
      console.error('[AuthContext] Failed to refresh session:', err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.checkAuthStatus();
        if (data.isAuthenticated) {
          data.user.permissions = data.user.permissions || [];
          setUser(data.user);
        } else {
          // Only set user to null if we don't already have a user (initial load)
          if (!user) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Don't automatically log out on auth check failure - keep existing user state
        if (!user) {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Only check auth on initial load, no periodic checks
    checkAuth();
  }, []);

  const login = (user: User) => {
    user.permissions = user.permissions || [];
    setUser(user);
    // Save user to localStorage for persistence
    try {
      localStorage.setItem('cityLibraryUser', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user to localStorage:', error);
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setUser(null);
      // Clear user from localStorage on manual logout
      localStorage.removeItem('cityLibraryUser');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        logout,
        refreshUser, // ✅ Provide function to components
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
