import { request } from '@umijs/max';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface InvoiceItemDTO {
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

export interface InvoiceResponseDTO {
  id: number;
  invoiceNumber?: string;
  customerId: number;
  customerName: string;
  status: InvoiceStatus;
  recurring?: boolean;
  recurringPlanId?: number;
  currency?: string;
  totalNet?: number;
  totalVat?: number;
  totalGross?: number;
  issuedAt?: string;
  paidAt?: string;
  dueDate?: string;
  paymentTermsDays?: number;
  overdue?: boolean;
  daysOverdue?: number;
  items?: InvoiceItemDTO[];
  createdAt?: string;
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

export async function listInvoicesPaged(params: {
  q?: string;
  status?: string;
  customerId?: number;
  recurring?: boolean;
  recurringPlanId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return request<ApiResponse<PaginatedResponse<InvoiceResponseDTO>>>(
    '/api/invoices/paged',
    {
      method: 'GET',
      params,
    },
  );
}

export async function createFromOrder(orderId: number) {
  return request<ApiResponse<InvoiceResponseDTO>>(
    `/api/orders/${orderId}/invoice`,
    {
      method: 'POST',
    },
  );
}

export async function getInvoice(id: number) {
  return request<ApiResponse<InvoiceResponseDTO>>(`/api/invoices/${id}`, {
    method: 'GET',
  });
}

export async function updateInvoiceStatus(id: number, status: InvoiceStatus) {
  return request<ApiResponse<InvoiceResponseDTO>>(
    `/api/invoices/${id}/status`,
    {
      method: 'PATCH',
      data: { status },
    },
  );
}

export async function deleteInvoice(id: number) {
  return request<ApiResponse<void>>(`/api/invoices/${id}`, {
    method: 'DELETE',
  });
}

export async function downloadInvoicePdf(id: number) {
  // returns a Blob so callers can open or download with auth headers applied
  return request<Blob>(`/api/invoices/${id}/pdf`, {
    method: 'GET',
    responseType: 'blob',
  });
}
