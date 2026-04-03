import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/base44Client';
import { logger } from '@/lib/logger';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check if there's already an active session on mount
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          logger.auth.sessionRestored(session.user.id);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        logger.auth.sessionCheckFailed(error.message);
        setAuthError({ type: 'unknown', message: error.message });
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.auth.stateChange(event, session?.user?.id);
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async (shouldRedirect = true) => {
    logger.auth.logout(user?.email);
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false, // No longer needed without Base44
      authError,
      appPublicSettings: null,        // No longer needed without Base44
      logout,
      navigateToLogin,
    }}>
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
