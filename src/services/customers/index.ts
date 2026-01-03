import { request } from '@umijs/max';

export interface CustomerDTO {
  id?: number;
  name: string;
  street?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  phone?: string;
  vatId?: string;
  taxNumber?: string;
  paymentTermsDays?: number;
  notes?: string;
  orderCount?: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export async function listCustomers(params: { search?: string }) {
  // use non-paged endpoint to avoid backend Specification null bug
  return request<ApiResponse<CustomerDTO[]>>('/api/customers', {
    method: 'GET',
    params: {
      // Backend errors on empty; '%' returns all
      search: params.search ?? '%',
    },
  });
}

export async function getCustomer(id: number) {
  return request<ApiResponse<CustomerDTO>>(`/api/customers/${id}`, {
    method: 'GET',
  });
}

export async function createCustomer(data: CustomerDTO) {
  return request<ApiResponse<CustomerDTO>>('/api/customers', {
    method: 'POST',
    data,
  });
}

export async function updateCustomer(id: number, data: CustomerDTO) {
  return request<ApiResponse<CustomerDTO>>(`/api/customers/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteCustomer(id: number) {
  return request<ApiResponse<void>>(`/api/customers/${id}`, {
    method: 'DELETE',
  });
}
