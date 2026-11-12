import api from './api.js';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (payload) => api.post('/auth/change-password', payload).then((r) => r.data)
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then((r) => r.data),
  getCharts: () => api.get('/dashboard/charts').then((r) => r.data),
  getActivity: () => api.get('/dashboard/activity').then((r) => r.data)
};

export const studentApi = {
  list: (params) => api.get('/students', { params }).then((r) => r.data),
  get: (id) => api.get(`/students/${id}`).then((r) => r.data),
  create: (payload) => api.post('/students', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/students/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/students/${id}`).then((r) => r.data),
  exportFile: (params) =>
    api.get('/students/export', { params, responseType: 'blob' }).then((r) => r.data)
};

export const admissionApi = {
  list: (params) => api.get('/admissions', { params }).then((r) => r.data),
  updateStatus: (id, payload) => api.put(`/admissions/${id}/status`, payload).then((r) => r.data)
};

export const paymentApi = {
  list: (params) => api.get('/payments', { params }).then((r) => r.data),
  create: (payload) => api.post('/payments', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/payments/${id}`, payload).then((r) => r.data)
};

export const visaApi = {
  list: (params) => api.get('/visa', { params }).then((r) => r.data),
  updateStatus: (id, payload) => api.put(`/visa/${id}/status`, payload).then((r) => r.data),
  listDocuments: (id) => api.get(`/visa/${id}/documents`).then((r) => r.data),
  addDocument: (id, payload) => api.post(`/visa/${id}/documents`, payload).then((r) => r.data),
  updateDocument: (id, docId, payload) =>
    api.put(`/visa/${id}/documents/${docId}`, payload).then((r) => r.data),
  deleteDocument: (id, docId) =>
    api.delete(`/visa/${id}/documents/${docId}`).then((r) => r.data)
};

export const flightApi = {
  list: (params) => api.get('/flights', { params }).then((r) => r.data),
  create: (payload) => api.post('/flights', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/flights/${id}`, payload).then((r) => r.data)
};

export const accommodationApi = {
  list: (params) => api.get('/accommodations', { params }).then((r) => r.data),
  create: (payload) => api.post('/accommodations', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/accommodations/${id}`, payload).then((r) => r.data)
};

export const documentApi = {
  list: (params) => api.get('/documents', { params }).then((r) => r.data),
  listByStudent: (studentId) => api.get(`/documents/${studentId}`).then((r) => r.data),
  upload: (formData) =>
    api
      .post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then((r) => r.data),
  getSignedUrl: (id, download = false) =>
    api.get(`/documents/file/${id}/signed-url`, { params: { download } }).then((r) => r.data),
  getVersions: (id) => api.get(`/documents/file/${id}/versions`).then((r) => r.data),
  verify: (id, payload) => api.put(`/documents/${id}/verify`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/documents/${id}`).then((r) => r.data)
};

export const staffApi = {
  list: (params) => api.get('/staff', { params }).then((r) => r.data),
  counselors: () => api.get('/staff/counselors').then((r) => r.data),
  create: (payload) => api.post('/staff', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/staff/${id}`, payload).then((r) => r.data)
};

export const reportApi = {
  get: (type, params) => api.get(`/reports/${type}`, { params }).then((r) => r.data),
  exportFile: (type, format = 'csv') =>
    api.get(`/reports/${type}/export`, { params: { format }, responseType: 'blob' }).then((r) => r.data)
};

export const activityApi = {
  list: (params) => api.get('/activity-logs', { params }).then((r) => r.data),
  notifications: (params) => api.get('/notifications', { params }).then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data)
};

export const settingsApi = {
  get: () => api.get('/settings').then((r) => r.data),
  update: (settings) => api.put('/settings', { settings }).then((r) => r.data)
};

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

