import { request } from '@umijs/max';

export interface Role {
  id?: number;
  name: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export async function listRoles() {
  return request<ApiResponse<Role[]>>('/api/roles');
}

export async function createRole(role: Role) {
  return request<ApiResponse<Role>>('/api/roles', {
    method: 'POST',
    data: role,
  });
}

export async function updateRole(role: Role) {
  return request<ApiResponse<Role>>('/api/roles', {
    method: 'PUT',
    data: role,
  });
}

export async function deleteRole(id: number) {
  return request<ApiResponse<void>>(`/api/roles/${id}`, {
    method: 'DELETE',
  });
}

export async function getUserRoles(userId: number) {
  return request<ApiResponse<string[]>>(`/api/users/${userId}/roles`);
}

export async function assignRole(userId: number, roleId: number) {
  return request<ApiResponse<void>>(`/api/users/${userId}/roles/${roleId}`, {
    method: 'POST',
  });
}

export async function removeRole(userId: number, roleId: number) {
  return request<ApiResponse<void>>(`/api/users/${userId}/roles/${roleId}`, {
    method: 'DELETE',
  });
}
