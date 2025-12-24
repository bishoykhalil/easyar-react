import {
  getSettings,
  updateSettings,
  type SettingsDTO,
} from '@/services/settings';
import {
  PageContainer,
  ProCard,
  ProForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';

const SettingsPage: React.FC = () => {
  const [initialValues, setInitialValues] = useState<SettingsDTO | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        setInitialValues(res.data);
      } catch (err: any) {
        message.error(err?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PageContainer>
      <ProCard title="Company Settings" bordered>
        <ProForm<SettingsDTO>
          layout="vertical"
          initialValues={initialValues}
          loading={loading}
          onFinish={async (values) => {
            try {
              await updateSettings(values);
              message.success('Settings saved');
              return true;
            } catch (err: any) {
              message.error(err?.data?.message || 'Save failed');
              return false;
            }
          }}
        >
          <ProFormText
            name="companyName"
            label="Company Name"
            rules={[{ required: true, message: 'Required' }]}
          />
          <ProFormTextArea name="companyAddress" label="Company Address" />
          <ProFormTextArea name="contactInfo" label="Contact Info" />
          <ProFormText name="vatId" label="VAT ID" />
          <ProFormText name="taxNumber" label="Tax Number" />
          <ProFormDigit
            name="defaultVatRate"
            label="Default VAT Rate"
            min={0}
            max={1}
            fieldProps={{ step: 0.01 }}
            tooltip="0.19 for 19%"
          />
          <ProFormText name="currency" label="Currency" placeholder="EUR" />
          <ProFormText
            name="invoiceNumberFormat"
            label="Invoice Number Format"
          />
          <ProFormText name="quoteNumberFormat" label="Quote Number Format" />
          <ProFormTextArea name="footerText" label="Footer Text" />
          <ProFormTextArea name="bankDetails" label="Bank Details" />
          <ProFormText
            name="themeMode"
            label="Theme Mode"
            placeholder="SYSTEM/LIGHT/DARK"
          />
        </ProForm>
      </ProCard>
    </PageContainer>
  );
};

export default SettingsPage;
