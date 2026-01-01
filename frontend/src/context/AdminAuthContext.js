import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_token');
    
    if (storedAdmin && token) {
      setAdmin(JSON.parse(storedAdmin));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await authAPI.adminLogin({ username, password });
    if (response.data.success) {
      localStorage.setItem('admin_token', response.data.access_token);
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
      setAdmin(response.data.user);
      return response.data;
    }
    throw new Error('Login failed');
  };

  const loginCashier = async (pin, branchId) => {
    const response = await authAPI.cashierLogin({ pin, branch_id: branchId });
    if (response.data.success) {
      localStorage.setItem('admin_token', response.data.access_token);
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
      setAdmin(response.data.user);
      return response.data;
    }
    throw new Error('Login failed');
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, loginCashier, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export default AdminAuthContext;
