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
import { getLocale, setLocale, useIntl, useModel } from '@umijs/max';
import { message, Space, theme } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

type SettingsFormValues = SettingsDTO & {
  language?: string;
};

const SettingsPage: React.FC = () => {
  const [initialValues, setInitialValues] = useState<SettingsDTO | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const formRef = useRef<any>();
  const { setInitialState } = useModel('@@initialState');
  const { token } = theme.useToken();
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        setInitialValues(res.data);
        formRef.current?.setFieldsValue({
          ...res.data,
          defaultVatRate:
            typeof res.data?.defaultVatRate === 'number'
              ? res.data.defaultVatRate <= 1
                ? Math.round(res.data.defaultVatRate * 100)
                : Math.round(res.data.defaultVatRate)
              : undefined,
          language: getLocale(),
        });
      } catch (err: any) {
        message.error(
          err?.data?.message ||
            t('message.settingsLoadFailed', 'Failed to load settings'),
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PageContainer>
      <ProForm<SettingsFormValues>
        layout="vertical"
        initialValues={initialValues}
        loading={loading}
        formRef={formRef}
        submitter={{
          searchConfig: {
            submitText: t('action.save', 'Save'),
            resetText: t('action.cancel', 'Cancel'),
          },
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
                background: token.colorBgElevated,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                zIndex: 10,
              }}
            >
              {doms}
            </div>
          ),
        }}
        onFinish={async (values) => {
          try {
            const { language, ...payload } = values;
            const normalizedPayload = {
              ...payload,
              defaultVatRate:
                typeof payload.defaultVatRate === 'number'
                  ? payload.defaultVatRate / 100
                  : payload.defaultVatRate,
            };
            await updateSettings(normalizedPayload);
            if (values.themeMode) {
              localStorage.setItem('easyar_theme', values.themeMode);
              await setInitialState((s: any) => ({
                ...s,
                themeMode: values.themeMode,
              }));
            }
            if (language) {
              setLocale(language, false);
            }
            message.success(t('message.settingsSaved', 'Settings saved'));
            return true;
          } catch (err: any) {
            message.error(
              err?.data?.message || t('message.saveFailed', 'Save failed'),
            );
            return false;
          }
        }}
      >
        <Space
          direction="vertical"
          size="middle"
          style={{ width: '100%', paddingBottom: 60 }}
        >
          <ProCard
            title={t('section.companyInfo', 'Company Info')}
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProFormGroup>
              <ProFormText
                name="companyName"
                label={t('label.companyName', 'Company Name')}
                rules={[
                  {
                    required: true,
                    message: t('message.required', 'Required'),
                  },
                ]}
                colProps={{ span: 12 }}
              />
              <ProFormText
                name="vatId"
                label={t('label.vatId', 'VAT ID')}
                colProps={{ span: 6 }}
              />
              <ProFormText
                name="taxNumber"
                label={t('label.taxNumber', 'Tax Number')}
                colProps={{ span: 6 }}
              />
            </ProFormGroup>
            <ProFormGroup>
              <ProFormTextArea
                name="companyAddress"
                label={t('label.companyAddress', 'Company Address')}
                colProps={{ span: 8 }}
                fieldProps={{ rows: 4 }}
              />
              <ProFormTextArea
                name="contactInfo"
                label={t('label.contactInfo', 'Contact Info')}
                colProps={{ span: 8 }}
                fieldProps={{ rows: 4 }}
              />
              <ProFormTextArea
                name="bankDetails"
                label={t('label.bankDetails', 'Bank Details')}
                colProps={{ span: 8 }}
                fieldProps={{ rows: 4 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard
            title={t('section.billingDefaults', 'Billing Defaults')}
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProFormGroup>
              <ProFormSelect
                name="currency"
                label={t('label.currency', 'Currency')}
                placeholder={t('placeholder.currency', 'EUR')}
                options={[
                  { label: 'EUR', value: 'EUR' },
                  { label: 'USD', value: 'USD' },
                  { label: 'GBP', value: 'GBP' },
                ]}
                colProps={{ span: 8 }}
              />
              <ProFormDigit
                name="defaultVatRate"
                label={t('label.defaultVatRate', 'Default VAT Rate')}
                min={0}
                max={100}
                fieldProps={{ step: 1, precision: 0 }}
                tooltip={t('hint.defaultVatRate', 'e.g., 19 for 19%')}
                placeholder={t('placeholder.defaultVatRate', '19')}
                colProps={{ span: 8 }}
              />
              <ProFormDigit
                name="lateFeeAmount"
                label={t('label.lateFeeAmount', 'Late Fee Amount')}
                min={0}
                fieldProps={{ step: 0.01 }}
                tooltip={t(
                  'hint.lateFeeAmount',
                  'Fixed net fee added to reminder invoices',
                )}
                placeholder={t('placeholder.lateFeeAmount', '0.00')}
                colProps={{ span: 8 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard
            title={t('section.numbering', 'Numbering')}
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProFormGroup>
              <ProFormText
                name="invoiceNumberFormat"
                label={t('label.invoiceNumberFormat', 'Invoice Number Format')}
                tooltip={t(
                  'hint.invoiceNumberFormat',
                  'e.g., INV-{yyyy}-{seq}',
                )}
                colProps={{ span: 12 }}
              />
              <ProFormText
                name="quoteNumberFormat"
                label={t('label.quoteNumberFormat', 'Quote Number Format')}
                tooltip={t('hint.quoteNumberFormat', 'e.g., Q-{yyyy}-{seq}')}
                colProps={{ span: 12 }}
              />
            </ProFormGroup>
          </ProCard>

          <ProCard
            title={t('section.communications', 'Communications')}
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProCard title={t('section.communications', 'Communications')}>
              <ProFormTextArea
                name="footerText"
                label={t('label.footerText', 'Footer Text')}
                tooltip={t(
                  'hint.footerText',
                  'Shown at the bottom of invoice PDFs',
                )}
                fieldProps={{
                  autoSize: { minRows: 6 },
                }}
              />
            </ProCard>
          </ProCard>

          <ProCard
            title={t('section.theme', 'Theme')}
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProFormSelect
              name="themeMode"
              label={t('label.themeMode', 'Theme Mode')}
              options={[
                { label: t('theme.system', 'System'), value: 'SYSTEM' },
                { label: t('theme.light', 'Light'), value: 'LIGHT' },
                { label: t('theme.dark', 'Dark'), value: 'DARK' },
              ]}
              colProps={{ span: 8 }}
            />
          </ProCard>

          <ProCard
            title={t('section.localization', 'Localization')}
            bordered
            bodyStyle={{ padding: 16 }}
          >
            <ProFormSelect
              name="language"
              label={intl.formatMessage({ id: 'settings.language' })}
              options={[
                {
                  label: intl.formatMessage({ id: 'settings.language.en' }),
                  value: 'en-US',
                },
                {
                  label: intl.formatMessage({ id: 'settings.language.de' }),
                  value: 'de-DE',
                },
              ]}
              colProps={{ span: 8 }}
              fieldProps={{
                onChange: (val) => setLocale(val, false),
              }}
            />
          </ProCard>
        </Space>
      </ProForm>
    </PageContainer>
  );
};

export default SettingsPage;
