import axios from 'axios';

const origin = typeof window !== 'undefined' ? window.location.origin : '';
const isVercelHost = typeof window !== 'undefined' && /vercel\.app$/i.test(window.location.host);
const API_BASE_URL =
  process.env.REACT_APP_API_BASE ||
  (isVercelHost
    ? 'https://employee-react-main.onrender.com/api'
    : (origin && /localhost/i.test(origin))
      ? 'http://localhost:5003/api'
      : origin
        ? `${origin}/api`
        : 'http://localhost:5003/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verify: () => api.get('/auth/verify'),
  getAllUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

export const employeeAPI = {
  getAllEmployees: () => api.get('/employees'),
  getEmployeeById: (id) => api.get(`/employees/${id}`),
  getMyProfile: () => api.get('/employees/me'),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  updateMyProfile: (data) => api.put('/employees/me', data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
  // Get employees for timesheet purposes only (limited data)
  getTimesheetEmployees: () => api.get('/employees/timesheet/employees'),
};

export const hikvisionAPI = {
  // Connection & Status
  getConnectionStatus: () => api.get('/hik/status'),
  testConnection: () => api.get('/hik/test-connection'),
  
  // Attendance Data
  getAttendance: (params) => api.get('/hik/attendance-data', { params }),
  pullEvents: (data) => api.post('/hik/pull-events', data),
  
  // Save Hikvision data to MongoDB
  saveAttendanceToDB: (data) => api.post('/attendance/save-hikvision-attendance', data),
  
  // Device Information
  getDeviceInfo: () => api.get('/hik/device-info'),
  
  // Test endpoints
  testSimple: (data) => api.post('/hik/test-simple', data),
  testAttendance: () => api.post('/hik/test-attendance'),
};

export const hikCentralAPI = {
  syncEmployees: () => api.post('/hik-employees/sync-employees'),
  getHikEmployees: (params) => api.get('/hik-employees/hik-employees', { params }),
  getHikEmployeeById: (personId) => api.get(`/hik-employees/hik-employees/${personId}`),
  getAttendanceReport: () => api.post('/hik-employees/attendance-report'),
  getHikAttendance: (params) => api.get('/hik-employees/hik-attendance', { params }),
  syncHikvisionAttendance: () => api.post('/hik-employees/sync-attendance'),
};

export const timesheetAPI = {
  saveTimesheet: (data) => api.post('/timesheets', data),
  getTimesheet: (params) => api.get('/timesheets', { params }),
  getMyTimesheets: () => api.get('/timesheets/my-timesheets'),
  getTimesheetById: (id) => api.get(`/timesheet-history/${id}`),
  updateTimesheetStatus: (id, status) => api.put(`/timesheet-history/${id}/status`, { status }),
  deleteTimesheet: (id) => api.delete(`/timesheets/${id}`),
  getAttendanceData: (params) => api.get('/attendance/my-week', { params }),
};

export const projectAPI = {
  getAllProjects: () => api.get('/projects'),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
};

export const policyAPI = {
  list: () => api.get('/policies'),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.put(`/policies/${id}`, data),
  remove: (id) => api.delete(`/policies/${id}`),
};

export const leaveAPI = {
  apply: (data) => api.post('/leaves', data),
  myLeaves: () => api.get('/leaves/my'),
  myBalance: () => api.get('/leaves/my-balance'),
  getBalance: (params) => api.get('/leaves/balance', params ? { params } : undefined),
  saveBalance: (data) => api.put('/leaves/balance/save', data),
  syncAllBalances: () => api.post('/leaves/balance/sync-all'),
  list: (params) => api.get('/leaves', params ? { params } : undefined),
  updateStatus: (id, status, rejectionReason) => api.put(`/leaves/${id}/status`, { status, rejectionReason }),
  update: (id, data) => api.put(`/leaves/${id}`, data),
  remove: (id) => api.delete(`/leaves/${id}`)
};

export const allocationAPI = {
  getAllAllocations: () => api.get('/allocations'),
  createAllocation: (data) => api.post('/allocations', data),
  updateAllocation: (id, data) => api.put(`/allocations/${id}`, data),
  deleteAllocation: (id) => api.delete(`/allocations/${id}`),
  getProjectCode: (projectName) => api.get(`/allocations/project-code/${encodeURIComponent(projectName)}`),
};

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

export const attendanceAPI = {
  // Local attendance records
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  getSummary: () => api.get('/attendance/summary'),
  regularize: (data) => api.post('/attendance/regularize', data),
  
  // Hikvision integration
  getHikvision: (params) => hikvisionAPI.getAttendance(params),
  syncHikvision: () => hikvisionAPI.pullEvents({}),
};

export const adminTimesheetAPI = {
  list: (params) => api.get('/admin-timesheet/list', { params }),
  approve: (id) => api.put(`/admin-timesheet/approve/${id}`),
  reject: (id, reason) => api.put(`/admin-timesheet/reject/${id}`, { reason }),
  summary: (params) => api.get('/admin-timesheet/summary', { params }),
};

export const attendanceApprovalAPI = {
  request: (data) => api.post('/attendance-approval/request', data),
  list: (params) => api.get('/attendance-approval/list', { params }),
  approve: (id) => api.put(`/attendance-approval/approve/${id}`),
  reject: (id, reason) => api.put(`/attendance-approval/reject/${id}`, { reason }),
};

export const teamAPI = {
  getLeaders: (type) => api.get('/teams/leaders', type ? { params: { type } } : undefined),
  list: () => api.get('/teams'),
  getByCode: (teamCode) => api.get(`/teams/${encodeURIComponent(teamCode)}`),
  upsert: (data) => api.post('/teams', data),
  addMember: (teamCode, employeeId) => api.post(`/teams/${encodeURIComponent(teamCode)}/members`, { employeeId }),
  removeMember: (teamCode, employeeId) => api.delete(`/teams/${encodeURIComponent(teamCode)}/members/${encodeURIComponent(employeeId)}`),
};

export const internAPI = {
  getAll: () => api.get('/interns'),
  getById: (id) => api.get(`/interns/${id}`),
  search: (params) => api.get('/interns/search', { params }),
  create: (data) => api.post('/interns', data),
  update: (id, data) => api.put(`/interns/${id}`, data),
  remove: (id) => api.delete(`/interns/${id}`),
};

export const payrollAPI = {
  list: () => api.get('/payroll'),
  create: (data) => api.post('/payroll', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  remove: (id) => api.delete(`/payroll/${id}`),
  getById: (id) => api.get(`/payroll/${id}`)
};

export const monthlyPayrollAPI = {
  save: (data) => api.post('/monthly-payroll/run', data),
  list: (params) => api.get('/monthly-payroll', { params }),
  getEmployeeHistory: (employeeId) => api.get(`/monthly-payroll/history/${employeeId}`),
  markEmailSent: (data) => api.put('/monthly-payroll/mark-email-sent', data),
  markPaid: (data) => api.put('/monthly-payroll/mark-paid', data),
  delete: (month) => api.delete(`/monthly-payroll/${month}`)
};

export const loanAPI = {
  list: (params) => api.get('/loans', { params }),
  getById: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  update: (id, data) => api.put(`/loans/${id}`, data),
  delete: (id) => api.delete(`/loans/${id}`),
  togglePayment: (id) => api.patch(`/loans/${id}/payment`),
};

export const expenditureAPI = {
  healthCheck: () => api.get('/expenditure/health-check'),
  saveMonthlyRecord: (data) => api.post('/expenditure/save-monthly', data),
  updateRecord: (id, data) => api.put(`/expenditure/update/${id}`, data),
  getSummary: (params) => api.get('/expenditure/summary', { params }),
  getRecordById: (id) => api.get(`/expenditure/record/${id}`),
  deleteRecord: (id) => api.delete(`/expenditure/record/${id}`)
};

export const exitFormalityAPI = {
  getAll: (params) => api.get('/exit-formalities', { params }),
  getPending: (params) => api.get('/exit-formalities/pending', { params }),
  getCompleted: (params) => api.get('/exit-formalities/completed', { params }),
  getDrafts: (params) => api.get('/exit-formalities/drafts', { params }),
  getMyExit: () => api.get('/exit-formalities/me'),
  getExitById: (id) => api.get(`/exit-formalities/${id}`),
  createExit: (data) => api.post('/exit-formalities', data),
  updateExit: (id, data) => api.put(`/exit-formalities/${id}`, data),
  submitExit: (id) => api.post(`/exit-formalities/${id}/submit`),
  getClearance: (id) => api.get(`/exit-formalities/${id}/clearance`),
  updateClearance: (id, department, status, remarks) => api.put(`/exit-formalities/${id}/clearance/${department}`, { status, remarks }),
  reject: (id, reason) => api.post(`/exit-formalities/${id}/reject`, { reason }),
  managerApprove: (id) => api.post(`/exit-formalities/${id}/manager-approve`),
  approve: (id) => api.post(`/exit-formalities/${id}/approve`),
  hrApprove: (id) => api.post(`/exit-formalities/${id}/hr-approve`),
  cancel: (id) => api.post(`/exit-formalities/${id}/cancel`),
  remove: (id) => api.delete(`/exit-formalities/${id}`),
};

// Announcements (management + public active list)
authAPI.announcement = {
  getAll: async () => {
    const res = await api.get('/announcements');
    return res.data;
  },
  getActive: async () => {
    const res = await api.get('/announcements/active');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/announcements', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/announcements/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  }
};

export default api;
