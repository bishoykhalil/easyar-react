import { listCustomers, type CustomerDTO } from '@/services/customers';
import { listPriceItemsPaged } from '@/services/pricelist';
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormGroup,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Divider, message, Table, Typography } from 'antd';
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
      setItems((prev) => {
        const matchIndex = prev.findIndex(
          (item) => item.priceListItemId === priceListItemId,
        );
        if (matchIndex >= 0) {
          const updated = [...prev];
          const current = updated[matchIndex];
          updated[matchIndex] = {
            ...current,
            quantity: (current.quantity || 0) + qty,
          };
          message.success('Quantity updated');
          return updated;
        }
        return [...prev, { priceListItemId, quantity: qty, name, unit }];
      });
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
      submitter={{
        searchConfig: {
          submitText: initialValues?.id ? 'Save' : 'Create',
          resetText: 'Cancel',
        },
        resetButtonProps: {
          onClick: () => onOpenChange(false),
        },
      }}
      formRef={formRef}
      onFinish={async (values) => {
        if (items.length === 0) {
          message.error('Add at least one item');
          return false;
        }
        const payload = { ...values, items };
        return onFinish(payload);
      }}
      onValuesChange={(changed) => {
        // auto-set nextRunDate to startDate if empty
        if (
          changed.startDate &&
          !formRef.current?.getFieldValue('nextRunDate')
        ) {
          formRef.current?.setFieldsValue({ nextRunDate: changed.startDate });
        }
      }}
    >
      <ProFormGroup>
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
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="currency"
          label="Currency"
          placeholder="EUR"
          colProps={{ span: 6 }}
          fieldProps={{ disabled: true }}
        />
        <ProFormDigit
          name="paymentTermsDays"
          label="Payment Terms (days)"
          min={0}
          max={365}
          placeholder="e.g. 14"
          colProps={{ span: 6 }}
          fieldProps={{ disabled: true }}
        />
      </ProFormGroup>

      <ProFormGroup>
        <ProFormSelect
          name="frequency"
          label="Frequency"
          valueEnum={{
            DAILY: 'Daily',
            WEEKLY: 'Weekly',
            MONTHLY: 'Monthly',
            YEARLY: 'Yearly',
          }}
          initialValue="MONTHLY"
          colProps={{ span: 6 }}
        />
        <ProFormDatePicker
          name="startDate"
          label="Start Date"
          rules={[{ required: true, message: 'Select start date' }]}
          colProps={{ span: 6 }}
        />
        <ProFormDatePicker
          name="nextRunDate"
          label="Next Run Date"
          tooltip="Defaults to start date if left empty"
          colProps={{ span: 6 }}
        />
        <ProFormDigit
          name="maxOccurrences"
          label="Max Occurrences"
          rules={[{ required: true, message: 'Enter max occurrences' }]}
          min={1}
          tooltip="Plan stops after this many invoices"
          colProps={{ span: 6 }}
        />
      </ProFormGroup>

      <ProFormTextArea
        name="notes"
        label="Notes"
        colProps={{ span: 24 }}
        fieldProps={{ rows: 3 }}
      />

      <Divider style={{ marginTop: 12, marginBottom: 12 }} />
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        Items
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Select a price list item, set quantity, and click Add. Prices/VAT will
        follow the selected item.
      </Typography.Paragraph>

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
            min={1}
            fieldProps={{ step: 1, precision: 0 }}
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
            { title: 'Unit', dataIndex: 'unit', width: 100 },
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
