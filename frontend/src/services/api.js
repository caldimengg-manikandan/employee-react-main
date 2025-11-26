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

// 🎯 HIKVISION API (WORKING ENDPOINTS)
export const hikvisionAPI = {
  // Connection & Status
  getConnectionStatus: () => api.get('/hik/status'),
  testConnection: () => api.get('/hik/test-connection'),
  
  // Attendance Data
  getAttendance: (params) => api.get('/hik/attendance-data', { params }),
  pullEvents: (data) => api.post('/hik/pull-events', data),
  
  // Save Hikvision data to MongoDB
  saveAttendanceToDB: (data) => api.post('/access/save-hikvision-attendance', data),
  
  // Device Information
  getDeviceInfo: () => api.get('/hik/device-info'),
  
  // Test endpoints
  testSimple: (data) => api.post('/hik/test-simple', data),
  testAttendance: () => api.post('/hik/test-attendance'),
};

// 🔵 HIKCENTRAL EMPLOYEE API
export const hikCentralAPI = {
  syncEmployees: () => api.post('/hik-employees/sync-employees'),
  getHikEmployees: (params) => api.get('/hik-employees/hik-employees', { params }),
  getHikEmployeeById: (personId) => api.get(`/hik-employees/hik-employees/${personId}`),
  getAttendanceReport: () => api.post('/hik-employees/attendance-report'),
  getHikAttendance: (params) => api.get('/hik-employees/hik-attendance', { params }),
  syncHikvisionAttendance: () => api.post('/hik-employees/sync-attendance'),
};

// 🕒 TIMESHEET API
export const timesheetAPI = {
  saveTimesheet: (data) => api.post('/timesheets', data),
  getTimesheet: (params) => api.get('/timesheets', { params }),
  getMyTimesheets: () => api.get('/timesheets/my-timesheets'),
  getTimesheetById: (id) => api.get(`/timesheet-history/${id}`),
  updateTimesheetStatus: (id, status) => api.put(`/timesheet-history/${id}/status`, { status }),
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
  // Local Access Control
  getMyLogs: (params) => api.get('/access/my-logs', { params }),
  punch: (data) => api.post('/access/punch', data),
  getStats: (params) => api.get('/access/stats', { params }),
  getEmployeeLogs: (params) => api.get('/access/logs', { params }),
  getEmployees: () => api.get('/employees'),
  
  // Hikvision Integration
  getHikvisionConnectionStatus: () => hikvisionAPI.getConnectionStatus(),
  pullHikvisionEvents: (data) => hikvisionAPI.pullEvents(data),
  getHikvisionAttendance: (params) => hikvisionAPI.getAttendance(params),
  syncHikvisionData: () => hikvisionAPI.pullEvents({}),
  
  // Local Database Attendance
  getLocalAttendance: (params) => api.get('/attendance', { params }),
  createAttendanceRecord: (data) => api.post('/attendance', data),
  getAttendanceSummary: () => api.get('/attendance/summary'),
  
  // Fallback methods
  testHikvisionConnection: () => hikvisionAPI.testConnection(),
};

// 📊 ATTENDANCE API (Dedicated)
export const attendanceAPI = {
  // Local attendance records
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  getSummary: () => api.get('/attendance/summary'),
  
  // Hikvision integration
  getHikvision: (params) => hikvisionAPI.getAttendance(params),
  syncHikvision: () => hikvisionAPI.pullEvents({}),
};

export default api;