import { request } from '@umijs/max';

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  profilePictureUrl?: string;
  roles?: { id: number; name: string }[];
}

export interface RegistrationRequest {
  name: string;
  email: string;
  password: string;
  roles?: string[];
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export async function getCurrentUser() {
  return request<ApiResponse<UserDTO>>('/api/users/me');
}

export async function getAllUsers() {
  return request<ApiResponse<UserDTO[]>>('/api/users/all');
}

export async function getUserById(id: number) {
  return request<ApiResponse<UserDTO>>(`/api/users/by-id/${id}`);
}

export async function updatePassword(data: {
  oldPassword: string;
  newPassword: string;
}) {
  return request<ApiResponse<void>>('/api/users/update-password', {
    method: 'PUT',
    data,
  });
}

export async function uploadProfilePicture(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<ApiResponse<string>>('/api/users/profile-picture', {
    method: 'PUT',
    data: formData,
  });
}

export async function createUser(data: RegistrationRequest) {
  return request<ApiResponse<UserDTO>>('/api/auth/register', {
    method: 'POST',
    data,
  });
}
