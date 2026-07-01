import api, { BASE_URL } from './api';

export const inductionService = {
  // Config
  getConfig: () => api.get('/induction/config'),
  saveConfig: (data) => api.post('/induction/config', data),

  // Documents
  getDocuments: () => api.get('/induction/documents'),
  uploadDocument: (formData) => api.post('/induction/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateDocument: (id, formData) => api.put(`/induction/documents/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteDocument: (id) => api.delete(`/induction/documents/${id}`),

  // Assessment
  getAssessment: () => api.get('/induction/assessment'),
  saveAssessment: (data) => api.post('/induction/assessment', data),

  // Progress
  getMyProgress: () => api.get('/induction/progress/me'),
  recordAction: (actionType, data) => api.post('/induction/progress/action', { actionType, data }),
  getAllProgress: () => api.get('/induction/progress/all'),
  verifyProgress: (userId) => api.put(`/induction/progress/verify/${userId}`),
  sendReminder: (userId) => api.post(`/induction/remind/${userId}`)
};

export { BASE_URL };
