import api from './axios';

export const getWorkspaces = () => api.get('/workspaces');
export const getWorkspace = (id) => api.get(`/workspaces/${id}`);
export const createWorkspace = (data) => api.post('/workspaces', data);
export const updateWorkspace = (id, data) => api.put(`/workspaces/${id}`, data);
export const deleteWorkspace = (id) => api.delete(`/workspaces/${id}`);
export const getMembers = (id) => api.get(`/workspaces/${id}/members`);
export const inviteMember = (id, data) => api.post(`/workspaces/${id}/members`, data);
export const removeMember = (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`);
export const getActivityLogs = (id, params) => api.get(`/workspaces/${id}/activity`, { params });
