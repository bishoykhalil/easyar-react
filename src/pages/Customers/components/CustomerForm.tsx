import type { CustomerDTO } from '@/services/customers';
import {
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialValues?: CustomerDTO;
  onFinish: (values: CustomerDTO) => Promise<boolean>;
};

const CustomerForm: React.FC<Props> = ({
  open,
  onOpenChange,
  initialValues,
  onFinish,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  return (
    <ModalForm<CustomerDTO>
      title={
        initialValues?.id
          ? t('modal.customerEdit', 'Edit Customer')
          : t('modal.customerNew', 'New Customer')
      }
      open={open}
      onOpenChange={onOpenChange}
      initialValues={{
        paymentTermsDays: 14,
        ...initialValues,
      }}
      modalProps={{
        destroyOnClose: true,
      }}
      layout="vertical"
      onFinish={onFinish}
      grid
      rowProps={{ gutter: 16 }}
      colProps={{ span: 12 }}
    >
      <ProFormText
        name="name"
        label={t('label.name', 'Name')}
        rules={[
          {
            required: true,
            message: t(
              'message.customerNameRequired',
              'Please enter customer name',
            ),
          },
        ]}
      />
      <ProFormText name="email" label={t('label.email', 'Email')} />
      <ProFormText name="phone" label={t('label.phone', 'Phone')} />
      <ProFormText name="street" label={t('label.street', 'Street')} />
      <ProFormText name="city" label={t('label.city', 'City')} />
      <ProFormText
        name="postalCode"
        label={t('label.postalCode', 'Postal Code')}
      />
      <ProFormText
        name="countryCode"
        label={t('label.countryCode', 'Country Code')}
        placeholder={t('placeholder.countryCode', 'e.g. DE')}
      />
      <ProFormDigit
        name="paymentTermsDays"
        label={t('label.paymentTermsDays', 'Payment Terms (days)')}
        min={0}
        max={365}
      />
      <ProFormText name="vatId" label={t('label.vatId', 'VAT ID')} />
      <ProFormText
        name="taxNumber"
        label={t('label.taxNumber', 'Tax Number')}
      />
      <ProFormTextArea
        name="notes"
        label={t('label.notes', 'Notes')}
        colProps={{ span: 24 }}
      />
    </ModalForm>
  );
};

export default CustomerForm;
