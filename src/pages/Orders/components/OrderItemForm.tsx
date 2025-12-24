import { listPriceItemsPaged } from '@/services/pricelist';
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

const OrderItemForm: React.FC<Props> = ({ open, onOpenChange, onFinish }) => {
  return (
    <ModalForm
      title="Add Item"
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
        name="priceListItemId"
        label="Price List Item"
        showSearch
        debounceTime={300}
        request={async ({ keyWords }) => {
          try {
            const res = await listPriceItemsPaged({
              q: keyWords && keyWords.length > 0 ? keyWords : '%',
              page: 0,
              size: 10,
            });
            return (
              res.data?.content?.map((p) => ({
                label: p.name || '',
                value: p.id!,
              })) || []
            );
          } catch {
            return [];
          }
        }}
        allowClear
      />
      <ProFormText
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter name' }]}
      />
      <ProFormTextArea
        name="description"
        label="Description"
        colProps={{ span: 24 }}
        fieldProps={{ rows: 3 }}
      />
      <ProFormText name="unit" label="Unit" />
      <ProFormDigit
        name="quantity"
        label="Quantity"
        min={0}
        fieldProps={{ step: 0.1 }}
      />
      <ProFormDigit
        name="unitPriceNet"
        label="Unit Net Price"
        min={0}
        fieldProps={{ step: 0.01 }}
      />
      <ProFormDigit
        name="vatRate"
        label="VAT Rate"
        min={0}
        max={1}
        fieldProps={{ step: 0.01 }}
        tooltip="0.19 for 19%"
      />
      <ProFormDigit
        name="discountPercent"
        label="Discount %"
        min={0}
        max={100}
        fieldProps={{ step: 1 }}
      />
    </ModalForm>
  );
};

export default OrderItemForm;
