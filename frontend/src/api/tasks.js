import api from './axios';

export const getTasks = (workspaceId, params) =>
  api.get(`/workspaces/${workspaceId}/tasks`, { params });

export const getTask = (workspaceId, taskId) =>
  api.get(`/workspaces/${workspaceId}/tasks/${taskId}`);

export const createTask = (workspaceId, data) =>
  api.post(`/workspaces/${workspaceId}/tasks`, data);

export const updateTask = (workspaceId, taskId, data) =>
  api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);

export const updateTaskStatus = (workspaceId, taskId, status) =>
  api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status`, { status });

export const assignTask = (workspaceId, taskId, assignedTo) =>
  api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/assign`, { assignedTo });

export const deleteTask = (workspaceId, taskId) =>
  api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
