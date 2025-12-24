import type { CustomerDTO } from '@/services/customers';
import {
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
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
  return (
    <ModalForm<CustomerDTO>
      title={initialValues?.id ? 'Edit Customer' : 'New Customer'}
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
        label="Name"
        rules={[{ required: true, message: 'Please enter customer name' }]}
      />
      <ProFormText name="email" label="Email" />
      <ProFormText name="phone" label="Phone" />
      <ProFormText name="street" label="Street" />
      <ProFormText name="city" label="City" />
      <ProFormText name="postalCode" label="Postal Code" />
      <ProFormText
        name="countryCode"
        label="Country Code"
        placeholder="e.g. DE"
      />
      <ProFormDigit
        name="paymentTermsDays"
        label="Payment Terms (days)"
        min={0}
        max={365}
      />
      <ProFormText name="vatId" label="VAT ID" />
      <ProFormText name="taxNumber" label="Tax Number" />
      <ProFormTextArea name="notes" label="Notes" colProps={{ span: 24 }} />
    </ModalForm>
  );
};

export default CustomerForm;
