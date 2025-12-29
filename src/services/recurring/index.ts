import { request } from '@umijs/max';

export interface RecurringPlanItemDTO {
  id?: number;
  priceListItemId?: number;
  name?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPriceNet?: number;
  vatRate?: number;
  discountPercent?: number;
}

export interface RecurringPlanDTO {
  id: number;
  customerId: number;
  customerName: string;
  currency?: string;
  paymentTermsDays?: number;
  frequency: string;
  startDate: string;
  nextRunDate: string;
  lastRunDate?: string;
  maxOccurrences: number;
  generatedCount: number;
  remainingOccurrences?: number;
  active: boolean;
  status?: string;
  notes?: string;
  items: RecurringPlanItemDTO[];
  createdAt?: string;
  updatedAt?: string;
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

export async function listPlans() {
  return request<ApiResponse<RecurringPlanDTO[]>>('/api/recurring-plans', {
    method: 'GET',
  });
}

export async function createPlan(data: any) {
  return request<ApiResponse<RecurringPlanDTO>>('/api/recurring-plans', {
    method: 'POST',
    data,
  });
}

export async function updatePlan(id: number, data: any) {
  return request<ApiResponse<RecurringPlanDTO>>(`/api/recurring-plans/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deletePlan(id: number) {
  return request<ApiResponse<void>>(`/api/recurring-plans/${id}`, {
    method: 'DELETE',
  });
}

export async function setPlanActive(id: number, active: boolean) {
  return request<ApiResponse<void>>(`/api/recurring-plans/${id}/active`, {
    method: 'PATCH',
    params: { active },
  });
}

export async function generateNow(id: number) {
  return request<ApiResponse<number>>(
    `/api/recurring-plans/${id}/generate-now`,
    {
      method: 'POST',
    },
  );
}

// Create recurring plan from an existing invoice (snapshots invoice items)
export async function createPlanFromInvoice(invoiceId: number, data: any) {
  return request<ApiResponse<RecurringPlanDTO>>(
    `/api/recurring-plans/from-invoice/${invoiceId}`,
    {
      method: 'POST',
      data,
    },
  );
}
