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
      priceListItemId?: number;
      quantity: number;
      name?: string;
      description?: string;
      unit?: string;
      unitPriceNet?: number;
      vatRate?: number;
      discountPercent?: number;
    }[]
  >([]);
  const isEditing = Boolean(initialValues?.id);
  const hasUnlinkedItems = items.some((item) => !item.priceListItemId);
  const itemsReadOnly = isEditing || hasUnlinkedItems;

  useEffect(() => {
    if (open) {
      const mapped = (initialValues?.items || []).map((it: any) => ({
        priceListItemId: it.priceListItemId,
        quantity: it.quantity || 1,
        name: it.name,
        description: it.description,
        unit: it.unit,
        unitPriceNet: it.unitPriceNet,
        vatRate: it.vatRate,
        discountPercent: it.discountPercent ?? 0,
      }));
      setItems(mapped);
      formRef.current?.setFieldsValue({
        tempItemId: undefined,
        tempItemName: undefined,
        tempItemUnit: undefined,
        tempItemDescription: undefined,
        tempItemUnitPriceNet: undefined,
        tempItemVatRate: undefined,
        tempQty: undefined,
      });
    }
  }, [open, initialValues]);

  const handleAddItem = async () => {
    if (itemsReadOnly) {
      message.warning('Items are read-only for existing plans');
      return;
    }
    try {
      const values = await formRef.current?.validateFields([
        'tempItemId',
        'tempQty',
      ]);
      const priceListItemId = values?.tempItemId;
      const qty = values?.tempQty;
      const name = values?.tempItemName;
      const unit = values?.tempItemUnit;
      const description = values?.tempItemDescription;
      const unitPriceNet =
        values?.tempItemUnitPriceNet !== undefined
          ? Number(values?.tempItemUnitPriceNet)
          : undefined;
      const vatRate =
        values?.tempItemVatRate !== undefined
          ? Number(values?.tempItemVatRate)
          : undefined;
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
        return [
          ...prev,
          {
            priceListItemId,
            quantity: qty,
            name,
            description,
            unit,
            unitPriceNet,
            vatRate,
            discountPercent: 0,
          },
        ];
      });
      formRef.current?.setFieldsValue({
        tempItemId: undefined,
        tempItemName: undefined,
        tempItemUnit: undefined,
        tempItemDescription: undefined,
        tempItemUnitPriceNet: undefined,
        tempItemVatRate: undefined,
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
        const payload = hasUnlinkedItems ? { ...values } : { ...values, items };
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
        {itemsReadOnly
          ? hasUnlinkedItems
            ? 'Items were created from an invoice and are read-only here.'
            : 'Items are read-only for existing plans.'
          : 'Select a price list item, set quantity, and click Add. Prices/VAT will follow the selected item.'}
      </Typography.Paragraph>

      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          padding: 12,
          width: '100%',
          overflowX: 'auto',
        }}
      >
        {!itemsReadOnly && (
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
              disabled={itemsReadOnly}
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
                      description: p.description || '',
                      unitPriceNet: p.priceNet,
                      vatRate: p.vatRate,
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
                    tempItemDescription: option?.description,
                    tempItemUnitPriceNet: option?.unitPriceNet,
                    tempItemVatRate: option?.vatRate,
                  });
                },
              }}
            />
            <ProFormText name="tempItemName" hidden />
            <ProFormText name="tempItemUnit" hidden />
            <ProFormText name="tempItemDescription" hidden />
            <ProFormText name="tempItemUnitPriceNet" hidden />
            <ProFormText name="tempItemVatRate" hidden />
            <ProFormDigit
              name="tempQty"
              label="Quantity"
              min={1}
              fieldProps={{ step: 1, precision: 0 }}
              rules={[{ required: true, message: 'Enter quantity' }]}
              disabled={itemsReadOnly}
            />
            <Button
              type="dashed"
              onClick={handleAddItem}
              disabled={itemsReadOnly}
            >
              Add
            </Button>
          </div>
        )}
        <Table
          size="small"
          style={{ marginTop: 12 }}
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={items.map((it, idx) => ({ key: idx, ...it }))}
          columns={[
            { title: 'Item', dataIndex: 'name', width: 140 },
            {
              title: 'Description',
              dataIndex: 'description',
              ellipsis: true,
            },
            { title: 'Unit', dataIndex: 'unit', width: 90 },
            {
              title: 'Quantity',
              dataIndex: 'quantity',
              width: 90,
              render: (val) => val ?? '-',
            },
            {
              title: 'Unit Net',
              dataIndex: 'unitPriceNet',
              width: 110,
              render: (val) =>
                typeof val === 'number' ? `EUR ${val.toFixed(2)}` : '-',
            },
            {
              title: 'VAT',
              dataIndex: 'vatRate',
              width: 90,
              render: (val) =>
                typeof val === 'number'
                  ? `${(val * 100).toFixed(2).replace(/\\.00$/, '')}%`
                  : '-',
            },
            {
              title: 'Discount %',
              dataIndex: 'discountPercent',
              width: 110,
              render: (val) =>
                typeof val === 'number'
                  ? `${val.toFixed(2).replace(/\\.00$/, '')}%`
                  : '0%',
            },
            {
              title: 'Net',
              width: 110,
              render: (_val, record) => {
                if (
                  typeof record.unitPriceNet !== 'number' ||
                  typeof record.quantity !== 'number'
                ) {
                  return '-';
                }
                const discount = record.discountPercent ?? 0;
                const net =
                  record.unitPriceNet * record.quantity * (1 - discount / 100);
                return `EUR ${net.toFixed(2)}`;
              },
            },
            {
              title: 'Gross',
              width: 110,
              render: (_val, record) => {
                if (
                  typeof record.unitPriceNet !== 'number' ||
                  typeof record.quantity !== 'number'
                ) {
                  return '-';
                }
                const discount = record.discountPercent ?? 0;
                const net =
                  record.unitPriceNet * record.quantity * (1 - discount / 100);
                const vat = record.vatRate ?? 0;
                return `EUR ${(net * (1 + vat)).toFixed(2)}`;
              },
            },
            ...(!itemsReadOnly
              ? [
                  {
                    title: '',
                    width: 70,
                    render: (_: any, __: any, index: number) => (
                      <a
                        style={{ color: 'red' }}
                        onClick={() => handleRemoveItem(index)}
                      >
                        Remove
                      </a>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </ModalForm>
  );
};

export default PlanForm;
