import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Check for admin token first, then customer token
  const adminToken = localStorage.getItem('admin_token');
  const customerToken = localStorage.getItem('auth_token');
  const token = adminToken || customerToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  cashierLogin: (data) => api.post('/auth/cashier/login', data),
  getMe: () => api.get('/auth/me'),
};

// Menu APIs
export const menuAPI = {
  getCategories: () => api.get('/menu/categories'),
  getAllCategories: () => api.get('/menu/categories/all'),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),
  getItems: (params) => api.get('/menu/items', { params }),
  getAllItems: () => api.get('/menu/items/all'),
  getItem: (id) => api.get(`/menu/items/${id}`),
  createItem: (data) => api.post('/menu/items', data),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  getModifierGroups: () => api.get('/menu/modifier-groups'),
  createModifierGroup: (data) => api.post('/menu/modifier-groups', data),
  updateModifierGroup: (id, data) => api.put(`/menu/modifier-groups/${id}`, data),
  deleteModifierGroup: (id) => api.delete(`/menu/modifier-groups/${id}`),
};

// Order APIs
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getActive: (branchId) => api.get('/orders/active', { params: { branch_id: branchId } }),
  get: (id) => api.get(`/orders/${id}`),
  track: (orderNumber) => api.get(`/orders/track/${orderNumber}`),
  getMyOrders: () => api.get('/orders/customer/my-orders'),
  updateStatus: (id, status, reason) => api.put(`/orders/${id}/status`, { status, reason }),
};

// Coupon APIs
export const couponAPI = {
  validate: (data) => api.post('/coupons/validate', data),
  getAll: () => api.get('/coupons'),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
};

// Loyalty APIs
export const loyaltyAPI = {
  getSettings: () => api.get('/loyalty/settings'),
  updateSettings: (data) => api.put('/loyalty/settings', data),
  getBalance: () => api.get('/loyalty/balance'),
};

// Customer APIs
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
};

// Branch APIs
export const branchAPI = {
  getAll: () => api.get('/branches'),
  getAllAdmin: () => api.get('/branches/all'),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
  checkDelivery: (id, data) => api.post(`/branches/${id}/check-delivery`, data),
};

// Reports APIs
export const reportAPI = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getTopItems: (params) => api.get('/reports/top-items', { params }),
};

// Settings APIs
export const settingsAPI = {
  getIntegrations: () => api.get('/settings/integrations'),
  updateIntegrations: (data) => api.put('/settings/integrations', data),
};

// Seed API
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
