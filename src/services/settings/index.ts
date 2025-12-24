import { request } from '@umijs/max';

export interface SettingsDTO {
  id?: number;
  companyName?: string;
  companyAddress?: string;
  contactInfo?: string;
  logoPath?: string;
  vatId?: string;
  taxNumber?: string;
  defaultVatRate?: number;
  currency?: string;
  invoiceNumberFormat?: string;
  quoteNumberFormat?: string;
  footerText?: string;
  bankDetails?: string;
  themeMode?: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export async function getSettings() {
  return request<ApiResponse<SettingsDTO>>('/api/settings', {
    method: 'GET',
  });
}

export async function updateSettings(data: SettingsDTO) {
  return request<ApiResponse<SettingsDTO>>('/api/settings', {
    method: 'PUT',
    data,
  });
}
