import type { PriceListItemDTO } from '@/services/pricelist';
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
  initialValues?: PriceListItemDTO;
  onFinish: (values: PriceListItemDTO) => Promise<boolean>;
};

const PriceItemForm: React.FC<Props> = ({
  open,
  onOpenChange,
  initialValues,
  onFinish,
}) => {
  return (
    <ModalForm<PriceListItemDTO>
      title={initialValues?.id ? 'Edit Item' : 'New Item'}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      layout="vertical"
      grid
      rowProps={{ gutter: 16 }}
      colProps={{ span: 12 }}
      modalProps={{ destroyOnClose: true }}
      onFinish={onFinish}
    >
      <ProFormText
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter name' }]}
      />
      <ProFormText name="unit" label="Unit" placeholder="e.g. hour, pc" />
      <ProFormDigit
        name="priceNet"
        label="Net Price"
        min={0}
        fieldProps={{ step: 0.01, prefix: '€' }}
        colProps={{ span: 12 }}
      />
      <ProFormDigit
        name="vatRate"
        label="VAT Rate"
        min={0}
        max={1}
        fieldProps={{ step: 0.01 }}
        colProps={{ span: 12 }}
        tooltip="0.19 for 19%"
      />
      <ProFormTextArea
        name="description"
        label="Description"
        colProps={{ span: 24 }}
        fieldProps={{ rows: 3 }}
      />
    </ModalForm>
  );
};

export default PriceItemForm;
