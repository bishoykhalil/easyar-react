import { listCustomers, type CustomerDTO } from '@/services/customers';
import { createFromOrder, downloadInvoicePdf } from '@/services/invoices';
import {
  addItem,
  createOrder,
  deleteOrder,
  getOrder,
  listOrdersPaged,
  removeItem,
  updateItem,
  type OrderItemDTO,
  type OrderResponseDTO,
  type OrderStatus,
} from '@/services/orders';
import { listPriceItemsPaged } from '@/services/pricelist';
import { formatCustomerLabel } from '@/utils/customers';
import { formatPriceItemLabel } from '@/utils/priceList';
import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ProFormInstance,
} from '@ant-design/pro-components';
import { history, useIntl, useLocation } from '@umijs/max';
import {
  Badge,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import OrderForm from './components/OrderForm';

const statusColors: Record<
  OrderStatus,
  'processing' | 'success' | 'default' | 'warning' | 'error'
> = {
  DRAFT: 'default',
  INVOICED: 'processing',
};

const OrdersPage: React.FC = () => {
  const actionRef = useRef<any>();
  const intl = useIntl();
  const [formOpen, setFormOpen] = useState(false);
  const [initialOrderValues, setInitialOrderValues] = useState<any>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<
    OrderResponseDTO | undefined
  >(undefined);
  const formRef = useRef<ProFormInstance>();
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDTO | null>(
    null,
  );
  const [statusQuickFilter, setStatusQuickFilter] = useState<string>('ALL');
  const [tableLoading, setTableLoading] = useState(false);
  const [tableData, setTableData] = useState<OrderResponseDTO[]>([]);
  const [filterCustomerId, setFilterCustomerId] = useState<number | undefined>(
    undefined,
  );
  const [filterCustomerName, setFilterCustomerName] = useState<
    string | undefined
  >(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [itemForm] = Form.useForm();
  const [priceOptions, setPriceOptions] = useState<
    { label: string; value: number; data: any }[]
  >([]);
  const [adding, setAdding] = useState(false);
  const [itemEdits, setItemEdits] = useState<
    Record<number, { quantity?: number; discountPercent?: number }>
  >({});
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [customerOptions, setCustomerOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });
  const statusLabel = (status: string) =>
    t(`status.${status.toLowerCase()}`, status);

  const openInvoicePdf = async (id: number) => {
    try {
      const blob = await downloadInvoicePdf(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      message.error(
        err?.data?.message ||
          t('message.failedToOpenPdf', 'Failed to open invoice PDF'),
      );
    }
  };

  const fetchPriceOptions = async (q?: string) => {
    try {
      const res = await listPriceItemsPaged({
        q: q && q.trim().length > 0 ? q : '%',
        onlyActive: true,
        page: 0,
        size: 10,
      });
      setPriceOptions(
        res.data?.content?.map((p) => ({
          label: formatPriceItemLabel(p.name, p.description),
          value: p.id!,
          data: p,
        })) || [],
      );
    } catch {
      setPriceOptions([]);
    }
  };

  useEffect(() => {
    if (drawerOpen) {
      fetchPriceOptions();
      itemForm.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // Open new order modal prefilled if query params instruct
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerId = params.get('customerId');
    const customerName = params.get('customerName') || undefined;
    setFilterCustomerId(customerId ? Number(customerId) : undefined);
    setFilterCustomerName(customerName || undefined);
    if (params.get('new') === '1') {
      setInitialOrderValues(
        customerId ? { customerId: Number(customerId) } : {},
      );
      setFormOpen(true);
    }
  }, [location.search]);

  const columns: ProColumns<OrderResponseDTO>[] = [
    {
      title: t('table.orderNumber', 'Order #'),
      dataIndex: 'orderNumber',
      render: (_, record) => (
        <a
          onClick={async () => {
            try {
              const res = await getOrder(record.id);
              setSelectedOrder(res.data);
              setDrawerOpen(true);
            } catch (err: any) {
              message.error(
                err?.data?.message ||
                  t('message.failedToLoadOrder', 'Failed to load order'),
              );
            }
          }}
        >
          {record.orderNumber || `#${record.id}`}
        </a>
      ),
    },
    {
      title: t('table.customer', 'Customer'),
      dataIndex: 'customerName',
      renderFormItem: (_, { type }, form) => {
        if (type === 'form') return null;
        return (
          <Select
            showSearch
            allowClear
            placeholder={t('placeholder.selectCustomer', 'Select customer')}
            filterOption={false}
            onSearch={async (v) => {
              try {
                const res = await listCustomers({
                  search: v && v.trim().length > 0 ? v : '%',
                });
                const map = new Map<string, string>();
                (res.data || []).forEach((c) => {
                  if (c.name && !map.has(c.name)) {
                    map.set(c.name, formatCustomerLabel(c.name, c.city));
                  }
                });
                const opts = Array.from(map.entries()).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                );
                setCustomerOptions(opts);
              } catch {
                // ignore
              }
            }}
            onChange={(val) => form?.setFieldValue?.('customerName', val)}
            options={customerOptions}
            style={{ width: '100%' }}
          />
        );
      },
      render: (_, record) => (
        <a
          onClick={async () => {
            try {
              const res = await listCustomers({
                search: record.customerName || '%',
              });
              const match =
                res.data?.find((c) => c.id === record.customerId) ||
                res.data?.find((c) => c.name === record.customerName) ||
                null;
              setCustomerDetails(match || null);
              setCustomerDrawerOpen(true);
            } catch (err: any) {
              message.error(
                err?.data?.message ||
                  t('message.failedToLoadCustomer', 'Failed to load customer'),
              );
            }
          }}
        >
          {record.customerName}
        </a>
      ),
    },
    {
      title: t('table.createdBy', 'Created by'),
      dataIndex: 'createdByName',
      hideInSearch: true,
      renderText: (val) => val || '-',
    },
    {
      title: t('table.status', 'Status'),
      dataIndex: 'status',
      render: (_, record) => (
        <Tag
          color={
            statusColors[record.status] === 'success'
              ? 'green'
              : statusColors[record.status] === 'processing'
              ? 'blue'
              : statusColors[record.status] === 'default'
              ? 'default'
              : statusColors[record.status] === 'warning'
              ? 'orange'
              : 'red'
          }
        >
          {statusLabel(record.status)}
        </Tag>
      ),
      valueType: 'select',
      valueEnum: {
        DRAFT: { text: statusLabel('DRAFT') },
        INVOICED: { text: statusLabel('INVOICED') },
      },
    },
    {
      title: t('table.net', 'Net'),
      dataIndex: 'totalNet',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      align: 'right',
    },
    {
      title: t('table.gross', 'Gross'),
      dataIndex: 'totalGross',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      align: 'right',
    },
    {
      title: t('table.createdAt', 'Created At'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      defaultSortOrder: 'descend',
      hideInSearch: true,
    },
    {
      title: t('table.actions', 'Actions'),
      valueType: 'option',
      render: (_, record) => {
        const canCreateInvoice =
          record.status === 'DRAFT' && (record.totalNet || 0) > 0;
        return (
          <Space>
            <a
              onClick={async () => {
                try {
                  const res = await getOrder(record.id);
                  setSelectedOrder(res.data);
                  setDrawerOpen(true);
                } catch (err: any) {
                  message.error(
                    err?.data?.message ||
                      t('message.failedToLoadOrder', 'Failed to load order'),
                  );
                }
              }}
            >
              {t('action.view', 'View')}
            </a>
            {record.invoiceId ? (
              <a
                onClick={() => {
                  if (record.invoiceId) {
                    openInvoicePdf(record.invoiceId);
                  }
                }}
              >
                {record.invoiceNumber
                  ? record.invoiceNumber
                  : t('action.viewInvoice', 'View Invoice')}
              </a>
            ) : (
              <a
                onClick={async () => {
                  if (!canCreateInvoice) return;
                  try {
                    await createFromOrder(record.id);
                    message.success(
                      t('message.invoiceCreated', 'Invoice created'),
                    );
                    actionRef.current?.reload();
                  } catch (err: any) {
                    const msg =
                      err?.data?.message ||
                      err?.response?.data?.message ||
                      err?.message ||
                      t(
                        'message.invoiceCreateFailed',
                        'Invoice creation failed',
                      );
                    message.error(msg);
                  }
                }}
                style={{
                  color: canCreateInvoice ? undefined : 'gray',
                  pointerEvents: canCreateInvoice ? 'auto' : 'none',
                }}
              >
                {t('action.createInvoice', 'Create Invoice')}
              </a>
            )}
            {record.status === 'DRAFT' && (
              <Popconfirm
                title={t('message.orderDeleteConfirm', 'Delete this order?')}
                onConfirm={async () => {
                  try {
                    await deleteOrder(record.id);
                    message.success(t('message.deleted', 'Deleted'));
                    actionRef.current?.reload();
                  } catch (err: any) {
                    message.error(
                      err?.data?.message ||
                        t('message.deleteFailed', 'Delete failed'),
                    );
                  }
                }}
              >
                <a style={{ color: 'red' }}>{t('action.delete', 'Delete')}</a>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const handleAddItem = async (values: any) => {
    if (!selectedOrder) return false;
    try {
      setAdding(true);
      const opt = priceOptions.find((p) => p.value === values.priceListItemId);
      const qtyToAdd = Number(values?.quantity || 0);
      const existingItem = selectedOrder.items?.find((item) => {
        if (values.priceListItemId && item.priceListItemId) {
          return item.priceListItemId === values.priceListItemId;
        }
        return (
          opt?.data &&
          item.name === opt.data.name &&
          item.unit === opt.data.unit
        );
      });

      if (existingItem?.id && qtyToAdd > 0) {
        const res = await updateItem(selectedOrder.id, existingItem.id, {
          quantity: (existingItem.quantity || 0) + qtyToAdd,
        });
        message.success(t('message.quantityUpdated', 'Quantity updated'));
        setSelectedOrder(res.data);
        actionRef.current?.reload();
        itemForm.resetFields();
        return true;
      }
      const payload: any = { ...values };
      if (opt?.data) {
        payload.name = opt.data.name;
        payload.description = opt.data.description;
        payload.unit = opt.data.unit;
        payload.unitPriceNet = opt.data.priceNet ?? opt.data.netPrice;
        payload.vatRate = opt.data.vatRate;
      }
      const res = await addItem(selectedOrder.id, payload);
      message.success(t('message.itemAdded', 'Item added'));
      setSelectedOrder(res.data);
      actionRef.current?.reload();
      itemForm.resetFields();
      return true;
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        t('message.addItemFailed', 'Add item failed');
      message.error(msg);
      return false;
    } finally {
      setAdding(false);
    }
  };

  const canCreateInvoice =
    selectedOrder?.status === 'DRAFT' && (selectedOrder.items?.length ?? 0) > 0;

  const commitOrderItemPatch = async (
    itemId: number,
    patch: Partial<OrderItemDTO>,
  ) => {
    if (!selectedOrder?.id) return;
    try {
      setSavingItemId(itemId);
      const res = await updateItem(selectedOrder.id, itemId, patch);
      setSelectedOrder(res.data);
      actionRef.current?.reload();
      setItemEdits((prev) => {
        const next = { ...prev };
        const entry = next[itemId];
        if (!entry) return prev;
        const cleaned = { ...entry };
        if ('quantity' in patch) delete cleaned.quantity;
        if ('discountPercent' in patch) delete cleaned.discountPercent;
        if (Object.keys(cleaned).length === 0) delete next[itemId];
        else next[itemId] = cleaned;
        return next;
      });
      message.success(t('message.updated', 'Updated'));
    } catch (err: any) {
      message.error(
        err?.data?.message || t('message.updateFailed', 'Update failed'),
      );
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <PageContainer>
      <div
        style={{
          margin: '0 0 12px',
          padding: '10px 12px',
          border: '1px solid #303030',
          borderRadius: 6,
          background: '#121212',
        }}
      >
        <Space size={24} wrap>
          <Typography.Text>
            {t('summary.draft', 'Draft')}:{' '}
            {tableData.filter((o) => o.status === 'DRAFT').length}
          </Typography.Text>
          <Typography.Text>
            {t('summary.invoiced', 'Invoiced')}:{' '}
            {tableData.filter((o) => o.status === 'INVOICED').length}
          </Typography.Text>
          <Typography.Text strong>
            {t('summary.netTotal', 'Net total')}:{' '}
            {money.format(
              tableData.reduce((sum, o) => sum + (o.totalNet || 0), 0),
            )}
          </Typography.Text>
          <Typography.Text strong>
            {t('summary.grossTotal', 'Gross total')}:{' '}
            {money.format(
              tableData.reduce((sum, o) => sum + (o.totalGross || 0), 0),
            )}
          </Typography.Text>
        </Space>
      </div>
      <ProTable<OrderResponseDTO>
        rowKey="id"
        actionRef={actionRef}
        formRef={formRef}
        columns={columns}
        loading={tableLoading}
        search={{
          labelWidth: 90,
          span: 6,
        }}
        locale={{
          emptyText: t(
            'empty.orders',
            'No orders yet. Create your first order.',
          ),
        }}
        request={async (params) => {
          setTableLoading(true);
          try {
            let data: OrderResponseDTO[] = [];

            // If order number provided, try direct fetch (id or orderNumber)
            if (params.orderNumber) {
              const orderNo = params.orderNumber;
              // try fetch by id
              try {
                const res = await getOrder(Number(orderNo));
                if (res.data) {
                  data = [res.data];
                }
              } catch {
                data = [];
              }
            } else {
              const res = await listOrdersPaged({
                q: params.keyword || '%',
                status: params.status,
                customerId: filterCustomerId,
                page: (params.current || 1) - 1,
                size: params.pageSize || 10,
                sort: undefined,
              });
              data = res.data?.content || [];
            }

            // client-side customer filter (case-insensitive)
            if (params.customerName) {
              const csearch = String(params.customerName).toLowerCase();
              data = data.filter(
                (o) =>
                  o.customerName &&
                  o.customerName.toLowerCase().includes(csearch),
              );
            }

            // status already applied via server when using status filter, but enforce if coming from quick pills
            if (params.status) {
              data = data.filter((o) => o.status === params.status);
            }

            setTableData(data);
            return {
              data,
              success: true,
              total: data.length,
            };
          } catch (err: any) {
            message.error(
              err?.data?.message ||
                t('message.failedToLoadOrders', 'Failed to load orders'),
            );
            return { data: [], success: false };
          } finally {
            setTableLoading(false);
          }
        }}
        onRow={(record) => {
          const color = record.status === 'INVOICED' ? '#1677ff' : '#999';
          return {
            style: {
              borderLeft: `3px solid ${color}`,
            },
          };
        }}
        toolbar={{
          title: t('page.orders', 'Orders'),
          subTitle: filterCustomerName
            ? `${t('label.filteredBy', 'Filtered by')}: ${filterCustomerName}`
            : undefined,
          actions: [
            filterCustomerId ? (
              <Button
                key="clear-filter"
                onClick={() => {
                  setFilterCustomerId(undefined);
                  setFilterCustomerName(undefined);
                  history.replace('/billing/orders');
                  actionRef.current?.reload();
                }}
              >
                {t('action.clearCustomerFilter', 'Clear Customer Filter')}
              </Button>
            ) : null,
            <Segmented
              key="quick-status"
              options={[
                { label: t('filter.all', 'All'), value: 'ALL' },
                { label: statusLabel('DRAFT'), value: 'DRAFT' },
                { label: statusLabel('INVOICED'), value: 'INVOICED' },
              ]}
              value={statusQuickFilter}
              onChange={(s) => {
                const val = s as string;
                setStatusQuickFilter(val);
                if (val === 'ALL') {
                  formRef.current?.setFieldsValue?.({
                    status: undefined,
                  });
                  formRef.current?.submit?.();
                } else {
                  formRef.current?.setFieldsValue?.({
                    status: val,
                  });
                  formRef.current?.submit?.();
                }
              }}
              size="small"
            />,
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setFormOpen(true);
              }}
            >
              {t('action.newOrder', 'New Order')}
            </Button>,
          ],
        }}
      />

      <OrderForm
        open={formOpen}
        onOpenChange={(v) => setFormOpen(v)}
        initialValues={initialOrderValues}
        onFinish={async (values) => {
          try {
            await createOrder(values);
            message.success(t('message.orderCreated', 'Order created'));
            setFormOpen(false);
            actionRef.current?.reload();
            setInitialOrderValues(undefined);
            history.replace('/billing/orders');
            return true;
          } catch (err: any) {
            message.error(
              err?.data?.message || t('message.createFailed', 'Create failed'),
            );
            return false;
          }
        }}
      />

      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(undefined);
          setItemEdits({});
          setSavingItemId(null);
        }}
        title={`${t('label.order', 'Order')} ${
          selectedOrder?.orderNumber || selectedOrder?.id || ''
        }`}
        styles={{
          body: {
            paddingTop: 0,
          },
        }}
      >
        {selectedOrder && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label={t('label.customer', 'Customer')}>
                {selectedOrder.customerName}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.status', 'Status')}>
                <Badge
                  status={statusColors[selectedOrder.status]}
                  text={statusLabel(selectedOrder.status)}
                />
              </Descriptions.Item>
              <Descriptions.Item label={t('label.invoice', 'Invoice')}>
                {selectedOrder.invoiceId ? (
                  <Space size={8}>
                    <a onClick={() => openInvoicePdf(selectedOrder.invoiceId!)}>
                      {selectedOrder.invoiceNumber ||
                        `${t('label.invoiceNumber', 'Invoice #')}${
                          selectedOrder.invoiceId
                        }`}
                    </a>
                  </Space>
                ) : (
                  <Button
                    type="link"
                    size="small"
                    disabled={!canCreateInvoice}
                    onClick={async () => {
                      try {
                        await createFromOrder(selectedOrder.id);
                        message.success(
                          t('message.invoiceCreated', 'Invoice created'),
                        );
                        // refresh order to get invoice linkage
                        const refreshed = await getOrder(selectedOrder.id);
                        setSelectedOrder(refreshed.data);
                        actionRef.current?.reload();
                      } catch (err: any) {
                        const msg =
                          err?.data?.message ||
                          err?.response?.data?.message ||
                          err?.message ||
                          t(
                            'message.invoiceCreateFailed',
                            'Invoice creation failed',
                          );
                        message.error(msg);
                      }
                    }}
                  >
                    {selectedOrder.status !== 'DRAFT'
                      ? t('order.alreadyInvoiced', 'Order already invoiced')
                      : canCreateInvoice
                      ? t('action.createInvoice', 'Create Invoice')
                      : t('order.addItemsToInvoice', 'Add items to invoice')}
                  </Button>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.currency', 'Currency')}>
                {selectedOrder.currency}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.createdBy', 'Created by')}>
                {selectedOrder.createdByName || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('label.createdByUserId', 'Created by User ID')}
              >
                {selectedOrder.createdByUserId ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.defaultVat', 'Default VAT')}>
                {selectedOrder.defaultVatRate}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.totalNet', 'Total Net')}>
                {selectedOrder.totalNet}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.totalGross', 'Total Gross')}>
                {selectedOrder.totalGross}
              </Descriptions.Item>
              <Descriptions.Item label={t('label.notes', 'Notes')} span={2}>
                {selectedOrder.notes}
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            {selectedOrder.status === 'DRAFT' && (
              <div
                style={{
                  padding: 12,
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <Form
                  form={itemForm}
                  layout="vertical"
                  onFinish={handleAddItem}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignItems: 'flex-end',
                    margin: 0,
                  }}
                >
                  <Form.Item
                    name="priceListItemId"
                    label={t('label.priceListItem', 'Price List Item')}
                    rules={[
                      {
                        required: true,
                        message: t('message.selectItemRequired', 'Select item'),
                      },
                    ]}
                    style={{ margin: 0, width: 280 }}
                  >
                    <Select
                      showSearch
                      allowClear
                      filterOption={false}
                      placeholder={t(
                        'placeholder.selectService',
                        'Select service',
                      )}
                      options={priceOptions}
                      onSearch={(v) => fetchPriceOptions(v)}
                    />
                  </Form.Item>
                  <Form.Item
                    name="quantity"
                    label={t('label.quantity', 'Quantity')}
                    rules={[
                      {
                        required: true,
                        message: t('message.quantityRequired', 'Qty required'),
                      },
                    ]}
                    style={{ margin: 0, width: 150 }}
                  >
                    <InputNumber
                      min={1}
                      step={1}
                      precision={0}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="discountPercent"
                    label={t('label.discount', 'Discount %')}
                    style={{ margin: 0, width: 150 }}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item style={{ margin: 0 }}>
                    <Button type="primary" htmlType="submit" loading={adding}>
                      {t('action.add', 'Add')}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.name', 'Name')}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.unit', 'Unit')}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.quantity', 'Qty')}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.discount', 'Discount %')}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.unitNet', 'Unit Net')}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.net', 'Net')}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    {t('table.gross', 'Gross')}
                  </th>
                  {selectedOrder.status === 'DRAFT' && (
                    <th style={{ width: 90 }}></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{ backgroundColor: idx % 2 ? '#1b1b1b' : '#151515' }}
                  >
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ color: '#666' }}>{item.description}</div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                      }}
                    >
                      {item.unit}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                        textAlign: 'right',
                      }}
                    >
                      {selectedOrder.status === 'DRAFT' && item.id ? (
                        <InputNumber
                          size="small"
                          min={0}
                          step={1}
                          precision={0}
                          style={{ width: 90 }}
                          value={
                            itemEdits[item.id]?.quantity ?? item.quantity ?? 0
                          }
                          disabled={savingItemId === item.id}
                          onChange={(val) => {
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id!]: {
                                ...prev[item.id!],
                                quantity: typeof val === 'number' ? val : 0,
                              },
                            }));
                          }}
                          onBlur={() => {
                            const nextQty = itemEdits[item.id!]?.quantity;
                            const currentQty = item.quantity ?? 0;
                            if (
                              typeof nextQty === 'number' &&
                              nextQty !== currentQty
                            ) {
                              commitOrderItemPatch(item.id!, {
                                quantity: nextQty,
                              });
                            }
                          }}
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                        textAlign: 'right',
                      }}
                    >
                      {selectedOrder.status === 'DRAFT' && item.id ? (
                        <InputNumber
                          size="small"
                          min={0}
                          max={100}
                          step={1}
                          precision={0}
                          style={{ width: 90 }}
                          value={
                            itemEdits[item.id]?.discountPercent ??
                            item.discountPercent ??
                            0
                          }
                          disabled={savingItemId === item.id}
                          onChange={(val) => {
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id!]: {
                                ...prev[item.id!],
                                discountPercent:
                                  typeof val === 'number' ? val : 0,
                              },
                            }));
                          }}
                          onBlur={() => {
                            const nextDisc =
                              itemEdits[item.id!]?.discountPercent;
                            const currentDisc = item.discountPercent ?? 0;
                            if (
                              typeof nextDisc === 'number' &&
                              nextDisc !== currentDisc
                            ) {
                              commitOrderItemPatch(item.id!, {
                                discountPercent: nextDisc,
                              });
                            }
                          }}
                        />
                      ) : (
                        item.discountPercent ?? 0
                      )}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                        textAlign: 'right',
                      }}
                    >
                      {item.unitPriceNet}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                        textAlign: 'right',
                      }}
                    >
                      {item.lineNet}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                        textAlign: 'right',
                      }}
                    >
                      {item.lineGross}
                    </td>
                    {selectedOrder.status === 'DRAFT' && item.id && (
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #303030',
                          textAlign: 'right',
                        }}
                      >
                        <a
                          style={{ color: 'red' }}
                          onClick={async () => {
                            try {
                              const res = await removeItem(
                                selectedOrder.id,
                                item.id!,
                              );
                              setSelectedOrder(res.data);
                              message.success(
                                t('message.itemRemoved', 'Item removed'),
                              );
                              actionRef.current?.reload();
                            } catch (err: any) {
                              message.error(
                                err?.data?.message ||
                                  t('message.removeFailed', 'Remove failed'),
                              );
                            }
                          }}
                        >
                          {t('action.remove', 'Remove')}
                        </a>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Drawer>

      <Drawer
        width={520}
        open={customerDrawerOpen}
        onClose={() => {
          setCustomerDrawerOpen(false);
          setCustomerDetails(null);
        }}
        title={`${t('label.customer', 'Customer')}: ${
          customerDetails?.name || ''
        }`}
      >
        {customerDetails ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('label.name', 'Name')}>
              {customerDetails.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.email', 'Email')}>
              {customerDetails.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.phone', 'Phone')}>
              {customerDetails.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.city', 'City')}>
              {customerDetails.city || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.country', 'Country')}>
              {customerDetails.countryCode || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={t('label.paymentTermsDays', 'Payment Terms (days)')}
            >
              {customerDetails.paymentTermsDays ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.vatId', 'VAT ID')}>
              {customerDetails.vatId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.taxNumber', 'Tax Number')}>
              {customerDetails.taxNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.address', 'Address')}>
              {customerDetails.street || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.postalCode', 'Postal Code')}>
              {customerDetails.postalCode || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('label.notes', 'Notes')}>
              {customerDetails.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('page.orders', 'Orders')}>
              <a
                onClick={() => {
                  history.push(
                    `/billing/orders?customerId=${
                      customerDetails.id
                    }&customerName=${encodeURIComponent(
                      customerDetails.name || '',
                    )}`,
                  );
                }}
              >
                {t(
                  'action.viewOrdersForCustomer',
                  'View orders for this customer',
                )}
              </a>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div>{t('empty.customer', 'No customer data.')}</div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default OrdersPage;
