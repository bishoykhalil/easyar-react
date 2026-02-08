import { listCustomers, type CustomerDTO } from '@/services/customers';
import {
  listPriceItemsPaged,
  type PriceListItemDTO,
} from '@/services/pricelist';
import { formatCustomerLabel } from '@/utils/customers';
import { formatPriceItemLabel } from '@/utils/priceList';
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormGroup,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
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
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });
  const [priceItemCache, setPriceItemCache] = useState<
    Record<number, PriceListItemDTO>
  >({});
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
        tempDiscount: 0,
        tempQty: undefined,
      });
    }
  }, [open, initialValues]);

  const handleAddItem = async () => {
    if (itemsReadOnly) {
      message.warning(
        t(
          'message.itemsReadOnlyForExistingPlans',
          'Items are read-only for existing plans',
        ),
      );
      return;
    }
    try {
      await formRef.current?.validateFields(['tempItemId', 'tempQty']);
      const rawItemId = formRef.current?.getFieldValue('tempItemId');
      const priceListItemId = rawItemId ? Number(rawItemId) : undefined;
      const qtyRaw = formRef.current?.getFieldValue('tempQty');
      const qty = typeof qtyRaw === 'number' ? qtyRaw : Number(qtyRaw);
      const cachedItem =
        priceListItemId && priceItemCache[priceListItemId]
          ? priceItemCache[priceListItemId]
          : undefined;
      const name =
        formRef.current?.getFieldValue('tempItemName') ?? cachedItem?.name;
      const unit =
        formRef.current?.getFieldValue('tempItemUnit') ?? cachedItem?.unit;
      const description =
        formRef.current?.getFieldValue('tempItemDescription') ??
        cachedItem?.description;
      const unitPriceNetRaw =
        formRef.current?.getFieldValue('tempItemUnitPriceNet') ??
        cachedItem?.priceNet;
      const unitPriceNet =
        unitPriceNetRaw !== undefined ? Number(unitPriceNetRaw) : undefined;
      const vatRateRaw =
        formRef.current?.getFieldValue('tempItemVatRate') ??
        cachedItem?.vatRate;
      const vatRate = vatRateRaw !== undefined ? Number(vatRateRaw) : undefined;
      const discountPercentRaw = formRef.current?.getFieldValue('tempDiscount');
      const discountPercent = Number(discountPercentRaw ?? 0);
      if (!priceListItemId || !Number.isFinite(qty) || qty <= 0) return;
      if (!name) {
        message.error(
          t(
            'message.selectValidPriceListItem',
            'Select a valid price list item',
          ),
        );
        return;
      }
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
          message.success(t('message.quantityUpdated', 'Quantity updated'));
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
            discountPercent,
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
        tempDiscount: 0,
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
      title={
        initialValues?.id
          ? t('modal.planEdit', 'Edit Plan')
          : t('modal.planNew', 'New Plan')
      }
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      modalProps={{ destroyOnClose: true }}
      layout="vertical"
      submitter={{
        searchConfig: {
          submitText: initialValues?.id
            ? t('action.save', 'Save')
            : t('action.create', 'Create'),
          resetText: t('action.cancel', 'Cancel'),
        },
        resetButtonProps: {
          onClick: () => onOpenChange(false),
        },
      }}
      formRef={formRef}
      onFinish={async (values) => {
        if (items.length === 0) {
          message.error(
            t('message.addAtLeastOneItem', 'Add at least one item'),
          );
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
          label={t('label.customer', 'Customer')}
          rules={[
            {
              required: true,
              message: t('message.selectCustomer', 'Please select customer'),
            },
          ]}
          showSearch
          debounceTime={300}
          request={async ({ keyWords }) => {
            try {
              const res = await listCustomers({
                search: keyWords && keyWords.length > 0 ? keyWords : '%',
              });
              return (
                res.data?.map((c: CustomerDTO) => ({
                  label: formatCustomerLabel(c.name, c.city),
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
          label={t('label.currency', 'Currency')}
          placeholder="EUR"
          colProps={{ span: 6 }}
          fieldProps={{ disabled: true }}
        />
        <ProFormDigit
          name="paymentTermsDays"
          label={t('label.paymentTermsDays', 'Payment Terms (days)')}
          min={0}
          max={365}
          placeholder={t('placeholder.paymentTerms', 'e.g. 14')}
          colProps={{ span: 6 }}
          fieldProps={{ disabled: true }}
        />
      </ProFormGroup>

      <ProFormGroup>
        <ProFormSelect
          name="frequency"
          label={t('label.frequency', 'Frequency')}
          valueEnum={{
            DAILY: t('frequency.daily', 'Daily'),
            WEEKLY: t('frequency.weekly', 'Weekly'),
            MONTHLY: t('frequency.monthly', 'Monthly'),
            YEARLY: t('frequency.yearly', 'Yearly'),
          }}
          initialValue="MONTHLY"
          colProps={{ span: 6 }}
        />
        <ProFormDatePicker
          name="startDate"
          label={t('label.startDate', 'Start Date')}
          rules={[
            {
              required: true,
              message: t('message.selectStartDate', 'Select start date'),
            },
          ]}
          colProps={{ span: 6 }}
        />
        <ProFormDatePicker
          name="nextRunDate"
          label={t('label.nextRunDate', 'Next Run Date')}
          tooltip={t(
            'tooltip.nextRunDefaultsToStart',
            'Defaults to start date if left empty',
          )}
          colProps={{ span: 6 }}
        />
        <ProFormDigit
          name="maxOccurrences"
          label={t('label.maxOccurrences', 'Max Occurrences')}
          rules={[
            {
              required: true,
              message: t(
                'message.enterMaxOccurrences',
                'Enter max occurrences',
              ),
            },
          ]}
          min={1}
          tooltip={t(
            'tooltip.planStopsAfter',
            'Plan stops after this many invoices',
          )}
          colProps={{ span: 6 }}
        />
      </ProFormGroup>

      <ProFormTextArea
        name="notes"
        label={t('label.notes', 'Notes')}
        colProps={{ span: 24 }}
        fieldProps={{ rows: 3 }}
      />

      <Divider style={{ marginTop: 12, marginBottom: 12 }} />
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t('section.items', 'Items')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {itemsReadOnly
          ? hasUnlinkedItems
            ? t(
                'plan.itemsHint.readOnlyFromInvoice',
                'Items were created from an invoice and are read-only here.',
              )
            : t(
                'plan.itemsHint.readOnlyExisting',
                'Items are read-only for existing plans.',
              )
          : t(
              'plan.itemsHint.selectAndAdd',
              'Select a price list item, set quantity, and click Add. Prices/VAT will follow the selected item.',
            )}
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
              gridTemplateColumns: '1fr 120px 120px 100px',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <ProFormSelect
              name="tempItemId"
              label={t('label.priceListItem', 'Price List Item')}
              showSearch
              debounceTime={300}
              disabled={itemsReadOnly}
              request={async ({ keyWords }) => {
                try {
                  const res = await listPriceItemsPaged({
                    q: keyWords && keyWords.length > 0 ? keyWords : '%',
                    onlyActive: true,
                    page: 0,
                    size: 20,
                  });
                  const content = res.data?.content || [];
                  if (content.length > 0) {
                    setPriceItemCache((prev) => {
                      const next = { ...prev };
                      content.forEach((item) => {
                        if (item.id !== undefined) {
                          next[item.id] = item;
                        }
                      });
                      return next;
                    });
                  }
                  return (
                    content.map((p) => ({
                      label: formatPriceItemLabel(p.name, p.description),
                      value: p.id!,
                      item: p,
                    })) || []
                  );
                } catch {
                  return [];
                }
              }}
              fieldProps={{
                onSelect: (_val, option: any) => {
                  const selected: PriceListItemDTO | undefined =
                    option?.item ??
                    (typeof _val === 'number'
                      ? priceItemCache[_val]
                      : undefined);
                  formRef.current?.setFieldsValue({
                    tempItemName: selected?.name ?? option?.label,
                    tempItemUnit: selected?.unit,
                    tempItemDescription: selected?.description,
                    tempItemUnitPriceNet: selected?.priceNet,
                    tempItemVatRate: selected?.vatRate,
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
              label={t('label.quantity', 'Quantity')}
              min={1}
              fieldProps={{ step: 1, precision: 0 }}
              disabled={itemsReadOnly}
            />
            <ProFormDigit
              name="tempDiscount"
              label={t('label.discountPercent', 'Discount %')}
              min={0}
              max={100}
              fieldProps={{ step: 1, precision: 0 }}
              disabled={itemsReadOnly}
            />
            <Button
              type="dashed"
              onClick={handleAddItem}
              disabled={itemsReadOnly}
            >
              {t('action.add', 'Add')}
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
            { title: t('table.name', 'Name'), dataIndex: 'name', width: 140 },
            {
              title: t('table.description', 'Description'),
              dataIndex: 'description',
              ellipsis: true,
            },
            { title: t('table.unit', 'Unit'), dataIndex: 'unit', width: 90 },
            {
              title: t('table.quantity', 'Qty'),
              dataIndex: 'quantity',
              width: 90,
              render: (val) => val ?? '-',
            },
            {
              title: t('table.unitNet', 'Unit Net'),
              dataIndex: 'unitPriceNet',
              width: 110,
              render: (val) =>
                typeof val === 'number' ? `EUR ${val.toFixed(2)}` : '-',
            },
            {
              title: t('table.vatRate', 'VAT Rate'),
              dataIndex: 'vatRate',
              width: 90,
              render: (val) =>
                typeof val === 'number'
                  ? `${(val * 100).toFixed(2).replace(/\\.00$/, '')}%`
                  : '-',
            },
            {
              title: t('table.discount', 'Discount %'),
              dataIndex: 'discountPercent',
              width: 110,
              render: (val) =>
                typeof val === 'number'
                  ? `${val.toFixed(2).replace(/\\.00$/, '')}%`
                  : '0%',
            },
            {
              title: t('table.net', 'Net'),
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
              title: t('table.gross', 'Gross'),
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
                        {t('action.remove', 'Remove')}
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
