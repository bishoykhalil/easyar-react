import { listPriceItemsPaged } from '@/services/pricelist';
import { formatPriceItemLabel } from '@/utils/priceList';
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
} from '@ant-design/pro-components';
import React, { useRef } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onFinish: (values: any) => Promise<boolean>;
};

const OrderItemForm: React.FC<Props> = ({ open, onOpenChange, onFinish }) => {
  const formRef = useRef<any>();

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
      formRef={formRef}
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
              onlyActive: true,
              page: 0,
              size: 10,
            });
            return (
              res.data?.content?.map((p) => ({
                label: formatPriceItemLabel(p.name, p.description),
                value: p.id!,
                data: p,
              })) || []
            );
          } catch {
            return [];
          }
        }}
        allowClear
        rules={[{ required: true, message: 'Select a price list item' }]}
        fieldProps={{
          onSelect: (_val, option: any) => {
            const data = option?.data || {};
            formRef.current?.setFieldsValue({
              unitPriceNet: data.netPrice,
              vatRate: data.vatRate,
            });
          },
        }}
      />
      <ProFormDigit
        name="quantity"
        label="Quantity"
        min={0}
        fieldProps={{ step: 0.1 }}
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
