import { request } from '@umijs/max';

export interface PriceListItemDTO {
  id?: number;
  name: string;
  description?: string;
  unit?: string;
  priceNet?: number;
  vatRate?: number;
  active?: boolean;
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

export async function listPriceItemsPaged(params: {
  q?: string;
  onlyActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return request<ApiResponse<PaginatedResponse<PriceListItemDTO>>>(
    '/api/pricelist/paged',
    {
      method: 'GET',
      params: {
        q: params.q ?? '%', // backend needs non-null keyword
        ...params,
      },
    },
  );
}

export async function createPriceItem(data: PriceListItemDTO) {
  return request<ApiResponse<PriceListItemDTO>>('/api/pricelist', {
    method: 'POST',
    data,
  });
}

export async function updatePriceItem(id: number, data: PriceListItemDTO) {
  return request<ApiResponse<PriceListItemDTO>>(`/api/pricelist/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function getPriceItem(id: number) {
  return request<ApiResponse<PriceListItemDTO>>(`/api/pricelist/${id}`, {
    method: 'GET',
  });
}

export async function disablePriceItem(id: number) {
  return request<ApiResponse<void>>(`/api/pricelist/${id}`, {
    method: 'DELETE',
  });
}
