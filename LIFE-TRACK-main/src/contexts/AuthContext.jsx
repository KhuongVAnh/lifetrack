import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axiosInstance, { API_BASE_URL } from '../config/axios';
import { toast } from 'react-toastify';
import { getHomePathForRole, normalizeUser } from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const disconnectSocket = () => {
    setSocket((currentSocket) => {
      if (currentSocket) {
        currentSocket.disconnect();
      }
      return null;
    });
  };

  const connectSocket = (userData) => {
    if (!userData?.user_id) return;

    disconnectSocket();

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-user-room', userData.user_id);
      newSocket.emit('join-role-room', userData.role);
    });

    setSocket(newSocket);
  };

  const applyAuthenticatedUser = (nextUser, token) => {
    const normalizedUser = normalizeUser(nextUser);
    if (token) {
      localStorage.setItem('access_token', token);
    }
    setUser(normalizedUser);
    connectSocket(normalizedUser);
    return normalizedUser;
  };

  // Restore session on mount
  useEffect(() => {
    const fetchMe = async () => {
      if (!localStorage.getItem('access_token')) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await axiosInstance.get('/auth/me');
        applyAuthenticatedUser(data.user);
      } catch (err) {
        // Interceptor might have already deleted the token
        console.error('Failed to restore session', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  // Listen to unauthorized event dispatched from interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      logout(false, false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axiosInstance.post('/auth/login', { email, password });
      const normalizedUser = applyAuthenticatedUser(data.user, data.token);
      toast.success(data.message || 'Đăng nhập thành công');
      return normalizedUser;
    } catch (err) {
      const msg = err.response?.data?.message || 'Tài khoản hoặc mật khẩu không đúng';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const logout = async (callApi = true, notify = false) => {
    try {
      if (callApi) {
        await axiosInstance.post('/auth/logout');
      }
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('access_token');
      delete axiosInstance.defaults.headers.common.Authorization;
      setUser(null);
      disconnectSocket();
      if (notify) {
        toast.info('Phiên đăng nhập đã kết thúc');
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        socket,
        login,
        logout,
        loading,
        homePath: getHomePathForRole(user?.normalizedRole ?? user?.role),
        isAuthenticated: Boolean(user),
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
