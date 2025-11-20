import axios from 'axios';

// Base API URL
const API_BASE_URL = 'http://localhost:5003/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000 // 20 second timeout for all requests
});

// Attach token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 🔐 AUTH API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verify: () => api.get('/auth/verify'),
  getAllUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// 👥 EMPLOYEE API
export const employeeAPI = {
  getAllEmployees: () => api.get('/employees'),
  getEmployeeById: (id) => api.get(`/employees/${id}`),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
};

// 🕒 TIMESHEET API
export const timesheetAPI = {
  // ➕ Submit a new timesheet
  saveTimesheet: (data) => api.post('/timesheets', data),

  // 📋 Fetch all timesheets (admin or filter)
  getTimesheet: (params) => api.get('/timesheets', { params }),

  // 📜 Fetch all timesheets for logged-in user (HISTORY)
  getMyTimesheets: () => api.get('/timesheets/my-timesheets'),

  // 🔍 Fetch single timesheet details
  getTimesheetById: (id) => api.get(`/timesheet-history/${id}`),

  // ✅ Update timesheet status (for manager)
  updateTimesheetStatus: (id, status) =>
    api.put(`/timesheet-history/${id}/status`, { status }),

  // 🗑️ Delete timesheet
  deleteTimesheet: (id) => api.delete(`/timesheets/${id}`),
};

// 🏗️ PROJECT API
export const projectAPI = {
  getAllProjects: () => api.get('/projects'),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
};

// 👥 ALLOCATION API
export const allocationAPI = {
  getAllAllocations: () => api.get('/allocations'),
  createAllocation: (data) => api.post('/allocations', data),
  updateAllocation: (id, data) => api.put(`/allocations/${id}`, data),
  deleteAllocation: (id) => api.delete(`/allocations/${id}`),
  getProjectCode: (projectName) => api.get(`/allocations/project-code/${encodeURIComponent(projectName)}`),
};

// 🔑 ACCESS/ATTENDANCE API
export const accessAPI = {
  getMyLogs: (params) => api.get('/access/my-logs', { params }),
  punch: (data) => api.post('/access/punch', data),
  getStats: (params) => api.get('/access/stats', { params }),
  pullHikvisionEvents: () => api.get('/hik/pull-events'),
  testHikvisionConnection: () => api.get('/hik/test-connection'),
};

export default api;
