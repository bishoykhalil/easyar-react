import { listCustomers, type CustomerDTO } from '@/services/customers';
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onFinish: (values: any) => Promise<boolean>;
};

const OrderForm: React.FC<Props> = ({ open, onOpenChange, onFinish }) => {
  return (
    <ModalForm
      title="New Order"
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnClose: true }}
      layout="vertical"
      grid
      rowProps={{ gutter: 16 }}
      colProps={{ span: 12 }}
      onFinish={onFinish}
    >
      <ProFormSelect
        name="customerId"
        label="Customer"
        rules={[{ required: true, message: 'Please select customer' }]}
        showSearch
        debounceTime={300}
        request={async ({ keyWords }) => {
          try {
            const res = await listCustomers({
              search: keyWords && keyWords.length > 0 ? keyWords : '%',
            });
            return (
              res.data?.map((c: CustomerDTO) => ({
                label: c.name,
                value: c.id!,
              })) || []
            );
          } catch {
            return [];
          }
        }}
      />
      <ProFormText name="currency" label="Currency" initialValue="EUR" />
      <ProFormDigit
        name="defaultVatRate"
        label="Default VAT Rate"
        min={0}
        max={1}
        fieldProps={{ step: 0.01 }}
        tooltip="0.19 for 19%"
      />
      <ProFormTextArea name="notes" label="Notes" colProps={{ span: 24 }} />
    </ModalForm>
  );
};

export default OrderForm;
