import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexusflow_token'));
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('nexusflow_token');
      const storedUser = localStorage.getItem('nexusflow_user');

      if (storedToken) {
        try {
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          // Verify token validity with backend
          const meData = await api.getMe();
          if (meData && meData.user) {
            setUser(meData.user);
            localStorage.setItem('nexusflow_user', JSON.stringify(meData.user));
          } else if (meData === false) {
            // Explicitly rejected (unauthorized)
            logout();
          }
        } catch (err) {
          console.warn('[AuthContext] Session revalidation error:', err);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    if (!data || data.error) {
      throw new Error(data?.error || 'Invalid credentials');
    }

    const { token: receivedToken, user: receivedUser } = data;
    localStorage.setItem('nexusflow_token', receivedToken);
    localStorage.setItem('nexusflow_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    if (!data || data.error) {
      throw new Error(data?.error || 'Registration failed');
    }

    const { token: receivedToken, user: receivedUser } = data;
    localStorage.setItem('nexusflow_token', receivedToken);
    localStorage.setItem('nexusflow_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('nexusflow_token');
    localStorage.removeItem('nexusflow_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
