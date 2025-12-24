import { listCustomers, type CustomerDTO } from '@/services/customers';
import { listPriceItemsPaged } from '@/services/pricelist';
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, message, Table } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialValues?: any;
  onFinish: (values: any) => Promise<boolean>;
};

const PlanForm: React.FC<Props> = ({
  open,
  onOpenChange,
  initialValues,
  onFinish,
}) => {
  const formRef = useRef<any>();
  const [items, setItems] = useState<
    {
      priceListItemId: number;
      quantity: number;
      name?: string;
      unit?: string;
    }[]
  >([]);

  useEffect(() => {
    if (open) {
      const mapped = (initialValues?.items || [])
        .filter((it: any) => it.priceListItemId)
        .map((it: any) => ({
          priceListItemId: it.priceListItemId,
          quantity: it.quantity || 1,
          name: it.name,
          unit: it.unit,
        }));
      setItems(mapped);
      formRef.current?.setFieldsValue({
        tempItemId: undefined,
        tempItemName: undefined,
        tempItemUnit: undefined,
        tempQty: undefined,
      });
    }
  }, [open, initialValues]);

  const handleAddItem = async () => {
    try {
      const values = await formRef.current?.validateFields([
        'tempItemId',
        'tempQty',
      ]);
      const priceListItemId = values?.tempItemId;
      const qty = values?.tempQty;
      const name = values?.tempItemName;
      const unit = values?.tempItemUnit;
      if (!priceListItemId || !qty) return;
      setItems((prev) => [
        ...prev,
        { priceListItemId, quantity: qty, name, unit },
      ]);
      formRef.current?.setFieldsValue({
        tempItemId: undefined,
        tempItemName: undefined,
        tempItemUnit: undefined,
        tempQty: undefined,
      });
    } catch {
      // ignore validation errors
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <ModalForm
      title={initialValues?.id ? 'Edit Plan' : 'New Plan'}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      modalProps={{ destroyOnClose: true }}
      layout="vertical"
      grid
      rowProps={{ gutter: 16 }}
      colProps={{ span: 12 }}
      formRef={formRef}
      onFinish={async (values) => {
        if (items.length === 0) {
          message.error('Add at least one item');
          return false;
        }
        const payload = { ...values, items };
        return onFinish(payload);
      }}
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
      <ProFormText name="currency" label="Currency" placeholder="EUR" />
      <ProFormDigit
        name="paymentTermsDays"
        label="Payment Terms (days)"
        min={0}
        max={365}
      />
      <ProFormDatePicker
        name="startDate"
        label="Start Date"
        rules={[{ required: true, message: 'Select start date' }]}
      />
      <ProFormDatePicker name="nextRunDate" label="Next Run Date" />
      <ProFormDigit
        name="maxOccurrences"
        label="Max Occurrences"
        rules={[{ required: true, message: 'Enter max occurrences' }]}
        min={1}
      />
      <ProFormTextArea name="notes" label="Notes" colProps={{ span: 24 }} />

      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          padding: 12,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 100px',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <ProFormSelect
            name="tempItemId"
            label="Price List Item"
            rules={[{ required: true, message: 'Select item' }]}
            showSearch
            debounceTime={300}
            request={async ({ keyWords }) => {
              try {
                const res = await listPriceItemsPaged({
                  q: keyWords && keyWords.length > 0 ? keyWords : '%',
                  page: 0,
                  size: 20,
                });
                return (
                  res.data?.content?.map((p) => ({
                    label: p.name || '',
                    value: p.id!,
                    unit: p.unit,
                    name: p.name || '',
                  })) || []
                );
              } catch {
                return [];
              }
            }}
            fieldProps={{
              onSelect: (_val, option: any) => {
                formRef.current?.setFieldsValue({
                  tempItemName: option?.name,
                  tempItemUnit: option?.unit,
                });
              },
            }}
          />
          <ProFormText name="tempItemName" hidden />
          <ProFormText name="tempItemUnit" hidden />
          <ProFormDigit
            name="tempQty"
            label="Quantity"
            min={0.1}
            fieldProps={{ step: 0.1 }}
            rules={[{ required: true, message: 'Enter quantity' }]}
          />
          <Button type="dashed" onClick={handleAddItem}>
            Add
          </Button>
        </div>
        <Table
          size="small"
          style={{ marginTop: 12 }}
          pagination={false}
          dataSource={items.map((it, idx) => ({ key: idx, ...it }))}
          columns={[
            { title: 'Item', dataIndex: 'name' },
            {
              title: 'Quantity',
              dataIndex: 'quantity',
              render: (val, record) => `${val} ${record.unit || ''}`,
            },
            {
              title: '',
              width: 60,
              render: (_: any, __: any, index: number) => (
                <a
                  style={{ color: 'red' }}
                  onClick={() => handleRemoveItem(index)}
                >
                  Remove
                </a>
              ),
            },
          ]}
        />
      </div>
    </ModalForm>
  );
};

export default PlanForm;
