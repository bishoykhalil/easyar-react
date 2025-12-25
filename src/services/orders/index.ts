import { request } from '@umijs/max';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'INVOICED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItemDTO {
  id?: number;
  priceListItemId?: number;
  name?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPriceNet?: number;
  vatRate?: number;
  lineNet?: number;
  lineVat?: number;
  lineGross?: number;
  discountPercent?: number;
}

export interface OrderResponseDTO {
  id: number;
  orderNumber?: string;
  customerId: number;
  customerName: string;
  status: OrderStatus;
  currency?: string;
  defaultVatRate?: number;
  notes?: string;
  totalNet?: number;
  totalVat?: number;
  totalGross?: number;
  items?: OrderItemDTO[];
  createdAt?: string;
  updatedAt?: string;
  invoiceId?: number;
  invoiceNumber?: string;
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

export async function listOrdersPaged(params: {
  q?: string;
  status?: string;
  customerId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return request<ApiResponse<PaginatedResponse<OrderResponseDTO>>>(
    '/api/orders/paged',
    {
      method: 'GET',
      params,
    },
  );
}

export async function createOrder(data: {
  customerId: number;
  currency?: string;
  defaultVatRate?: number;
  notes?: string;
}) {
  return request<ApiResponse<OrderResponseDTO>>('/api/orders', {
    method: 'POST',
    data,
  });
}

export async function getOrder(orderId: number) {
  return request<ApiResponse<OrderResponseDTO>>(`/api/orders/${orderId}`, {
    method: 'GET',
  });
}

export async function updateStatus(orderId: number, status: OrderStatus) {
  return request<ApiResponse<OrderResponseDTO>>(
    `/api/orders/${orderId}/status`,
    {
      method: 'PATCH',
      data: { status },
    },
  );
}

export async function deleteOrder(orderId: number) {
  return request<ApiResponse<void>>(`/api/orders/${orderId}`, {
    method: 'DELETE',
  });
}

export async function addItem(orderId: number, data: any) {
  return request<ApiResponse<OrderResponseDTO>>(
    `/api/orders/${orderId}/items`,
    {
      method: 'POST',
      data,
    },
  );
}

export async function removeItem(orderId: number, itemId: number) {
  return request<ApiResponse<OrderResponseDTO>>(
    `/api/orders/${orderId}/items/${itemId}`,
    {
      method: 'DELETE',
    },
  );
}
