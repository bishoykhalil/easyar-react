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
  ProFormGroup,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message, Space } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const SettingsPage: React.FC = () => {
  const [initialValues, setInitialValues] = useState<SettingsDTO | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const formRef = useRef<any>();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        setInitialValues(res.data);
        formRef.current?.setFieldsValue(res.data);
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
      <ProForm<SettingsDTO>
        layout="vertical"
        initialValues={initialValues}
        loading={loading}
        formRef={formRef}
        submitter={{
          searchConfig: { submitText: 'Save', resetText: 'Cancel' },
          resetButtonProps: {
            onClick: () => {
              setInitialValues(initialValues); // no-op, just close
            },
          },
          render: (props, doms) => (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                padding: '12px 16px',
                background: '#f5f5f5',
                borderTop: '1px solid #eaeaea',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              {doms}
            </div>
          ),
        }}
        onFinish={async (values) => {
          try {
            await updateSettings(values);
            if (values.themeMode) {
              localStorage.setItem('easyar_theme', values.themeMode);
            }
            message.success('Settings saved');
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Save failed');
            return false;
          }
        }}
      >
        <Space
          direction="vertical"
          size="middle"
          style={{ width: '100%', paddingBottom: 60 }}
        >
          <ProCard title="Company Info" bordered bodyStyle={{ padding: 16 }}>
            <ProFormGroup>
              <ProFormText
                name="companyName"
                label="Company Name"
                rules={[{ required: true, message: 'Required' }]}
                colProps={{ span: 12 }}
              />
              <ProFormText name="vatId" label="VAT ID" colProps={{ span: 6 }} />
              <ProFormText
                name="taxNumber"
                label="Tax Number"
                colProps={{ span: 6 }}
              />
            </ProFormGroup>
            <ProFormGroup>
              <ProFormTextArea
                name="companyAddress"
                label="Company Address"
                colProps={{ span: 12 }}
                fieldProps={{ rows: 3 }}
              />
              <ProFormTextArea
                name="contactInfo"
                label="Contact Info"
                colProps={{ span: 12 }}
                fieldProps={{ rows: 3 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard
            title="Billing Defaults"
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProFormGroup>
              <ProFormSelect
                name="currency"
                label="Currency"
                placeholder="EUR"
                options={[
                  { label: 'EUR', value: 'EUR' },
                  { label: 'USD', value: 'USD' },
                  { label: 'GBP', value: 'GBP' },
                ]}
                colProps={{ span: 8 }}
              />
              <ProFormDigit
                name="defaultVatRate"
                label="Default VAT Rate"
                min={0}
                max={1}
                fieldProps={{ step: 0.01 }}
                tooltip="e.g., 0.19 for 19%"
                placeholder="0.19"
                colProps={{ span: 8 }}
              />
              <ProFormDigit
                name="lateFeeAmount"
                label="Late Fee Amount"
                min={0}
                fieldProps={{ step: 0.01 }}
                tooltip="Fixed net fee added to reminder invoices"
                placeholder="0.00"
                colProps={{ span: 8 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard title="Numbering" bordered bodyStyle={{ padding: 16 }}>
            <ProFormGroup>
              <ProFormText
                name="invoiceNumberFormat"
                label="Invoice Number Format"
                tooltip="e.g., INV-{yyyy}-{seq}"
                colProps={{ span: 12 }}
              />
              <ProFormText
                name="quoteNumberFormat"
                label="Quote Number Format"
                tooltip="e.g., Q-{yyyy}-{seq}"
                colProps={{ span: 12 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard title="Communications" bordered>
            <ProFormGroup>
              <ProFormTextArea
                name="footerText"
                label="Footer Text"
                colProps={{ span: 12 }}
                fieldProps={{ rows: 3 }}
              />
              <ProFormTextArea
                name="bankDetails"
                label="Bank Details"
                colProps={{ span: 12 }}
                fieldProps={{ rows: 3 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard title="Theme" bordered bodyStyle={{ padding: 16 }}>
            <ProFormSelect
              name="themeMode"
              label="Theme Mode"
              options={[
                { label: 'System', value: 'SYSTEM' },
                { label: 'Light', value: 'LIGHT' },
                { label: 'Dark', value: 'DARK' },
              ]}
              colProps={{ span: 8 }}
            />
          </ProCard>
        </Space>
      </ProForm>
    </PageContainer>
  );
};

export default SettingsPage;
