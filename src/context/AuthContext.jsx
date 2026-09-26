import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { getAuthToken, clearAuthToken } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Restores authenticated user profile from backend on app startup
   */
  const restoreSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return null;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.getCurrentUser();
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setAuthLoading(false);
        return res.user;
      } else {
        throw new Error('Invalid user session payload.');
      }
    } catch (err) {
      console.warn('[AuthContext] Session restoration failed:', err.message);
      clearAuthToken();
      setCurrentUser(null);
      setAuthLoading(false);
      return null;
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * User or Admin Login
   */
  const login = useCallback(async (email, password, expectedRole = null) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.login({ email, password });
      if (res && res.success && res.user) {
        const actualRole = String(res.user.role || '').toUpperCase();
        if (expectedRole && actualRole !== String(expectedRole).toUpperCase()) {
          clearAuthToken();
          throw new Error(`These credentials belong to the ${actualRole === 'ADMIN' ? 'Administration & Operations' : 'User & Fleet Operator'} portal. Please choose that portal and sign in there.`);
        }
        setCurrentUser(res.user);
        setAuthLoading(false);
        return res.user;
      }
      throw new Error(res?.message || 'Login failed.');
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
      setAuthLoading(false);
      throw err;
    }
  }, []);

  /**
   * Public User Registration (strictly USER role)
   */
  const register = useCallback(async (fullName, email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.register({ fullName, email, password });
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setAuthLoading(false);
        return res.user;
      }
      throw new Error(res?.message || 'Registration failed.');
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      setAuthLoading(false);
      throw err;
    }
  }, []);

  /**
   * Terminate active authenticated session
   */
  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.warn('[AuthContext] Logout warning:', err.message);
    } finally {
      setCurrentUser(null);
      setAuthError(null);
      setAuthLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentUser?.role === 'ADMIN',
      isUser: currentUser?.role === 'USER',
      authLoading,
      authError,
      login,
      register,
      logout,
      restoreSession,
      setCurrentUser,
    }),
    [currentUser, authLoading, authError, login, register, logout, restoreSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
