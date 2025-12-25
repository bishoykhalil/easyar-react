import { listCustomers, type CustomerDTO } from '@/services/customers';
import {
  ModalForm,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialValues?: any;
  onFinish: (values: any) => Promise<boolean>;
};

const OrderForm: React.FC<Props> = ({
  open,
  onOpenChange,
  initialValues,
  onFinish,
}) => {
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
      initialValues={initialValues}
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
      <ProFormTextArea name="notes" label="Notes" colProps={{ span: 24 }} />
    </ModalForm>
  );
};

export default OrderForm;
