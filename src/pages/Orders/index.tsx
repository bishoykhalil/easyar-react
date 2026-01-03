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
  type OrderResponseDTO,
  type OrderStatus,
} from '@/services/orders';
import { listPriceItemsPaged } from '@/services/pricelist';
import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ProFormInstance,
} from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
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
  const [customerOptions, setCustomerOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });

  const openInvoicePdf = async (id: number) => {
    try {
      const blob = await downloadInvoicePdf(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      message.error(err?.data?.message || 'Failed to open invoice PDF');
    }
  };

  const fetchPriceOptions = async (q?: string) => {
    try {
      const res = await listPriceItemsPaged({
        q: q && q.trim().length > 0 ? q : '%',
        page: 0,
        size: 10,
      });
      setPriceOptions(
        res.data?.content?.map((p) => ({
          label: p.name || '',
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
      title: 'Order #',
      dataIndex: 'orderNumber',
      render: (_, record) => (
        <a
          onClick={async () => {
            try {
              const res = await getOrder(record.id);
              setSelectedOrder(res.data);
              setDrawerOpen(true);
            } catch (err: any) {
              message.error(err?.data?.message || 'Failed to load order');
            }
          }}
        >
          {record.orderNumber || `#${record.id}`}
        </a>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      renderFormItem: (_, { type }, form) => {
        if (type === 'form') return null;
        return (
          <Select
            showSearch
            allowClear
            placeholder="Select customer"
            filterOption={false}
            onSearch={async (v) => {
              try {
                const res = await listCustomers({
                  search: v && v.trim().length > 0 ? v : '%',
                });
                const opts =
                  res.data
                    ?.map((c) => ({ label: c.name, value: c.name }))
                    .filter(
                      (o, idx, arr) =>
                        arr.findIndex((x) => x.value === o.value) === idx,
                    ) || [];
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
              message.error(err?.data?.message || 'Failed to load customer');
            }
          }}
        >
          {record.customerName}
        </a>
      ),
    },
    {
      title: 'Status',
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
          {record.status}
        </Tag>
      ),
      valueType: 'select',
      valueEnum: {
        DRAFT: { text: 'DRAFT' },
        INVOICED: { text: 'INVOICED' },
      },
    },
    {
      title: 'Net',
      dataIndex: 'totalNet',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      align: 'right',
    },
    {
      title: 'Gross',
      dataIndex: 'totalGross',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      align: 'right',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      defaultSortOrder: 'descend',
      hideInSearch: true,
    },
    {
      title: 'Actions',
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
                  message.error(err?.data?.message || 'Failed to load order');
                }
              }}
            >
              View
            </a>
            {record.invoiceId ? (
              <a
                onClick={() => {
                  if (record.invoiceId) {
                    openInvoicePdf(record.invoiceId);
                  }
                }}
              >
                {record.invoiceNumber ? record.invoiceNumber : 'View Invoice'}
              </a>
            ) : (
              <a
                onClick={async () => {
                  if (!canCreateInvoice) return;
                  try {
                    await createFromOrder(record.id);
                    message.success('Invoice created');
                    actionRef.current?.reload();
                  } catch (err: any) {
                    const msg =
                      err?.data?.message ||
                      err?.response?.data?.message ||
                      err?.message ||
                      'Invoice creation failed';
                    message.error(msg);
                  }
                }}
                style={{
                  color: canCreateInvoice ? undefined : 'gray',
                  pointerEvents: canCreateInvoice ? 'auto' : 'none',
                }}
              >
                Create Invoice
              </a>
            )}
            {record.status === 'DRAFT' && (
              <Popconfirm
                title="Delete this order?"
                onConfirm={async () => {
                  try {
                    await deleteOrder(record.id);
                    message.success('Deleted');
                    actionRef.current?.reload();
                  } catch (err: any) {
                    message.error(err?.data?.message || 'Delete failed');
                  }
                }}
              >
                <a style={{ color: 'red' }}>Delete</a>
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
        message.success('Quantity updated');
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
      message.success('Item added');
      setSelectedOrder(res.data);
      actionRef.current?.reload();
      itemForm.resetFields();
      return true;
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Add item failed';
      message.error(msg);
      return false;
    } finally {
      setAdding(false);
    }
  };

  const canCreateInvoice =
    selectedOrder?.status === 'DRAFT' && (selectedOrder.items?.length ?? 0) > 0;

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
            Draft: {tableData.filter((o) => o.status === 'DRAFT').length}
          </Typography.Text>
          <Typography.Text>
            Invoiced: {tableData.filter((o) => o.status === 'INVOICED').length}
          </Typography.Text>
          <Typography.Text strong>
            Net total:{' '}
            {money.format(
              tableData.reduce((sum, o) => sum + (o.totalNet || 0), 0),
            )}
          </Typography.Text>
          <Typography.Text strong>
            Gross total:{' '}
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
        locale={{ emptyText: 'No orders yet. Create your first order.' }}
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
            message.error(err?.data?.message || 'Failed to load orders');
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
          title: 'Orders',
          subTitle: filterCustomerName
            ? `Filtered by: ${filterCustomerName}`
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
                Clear Customer Filter
              </Button>
            ) : null,
            <Segmented
              key="quick-status"
              options={['ALL', 'DRAFT', 'INVOICED']}
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
              New Order
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
            message.success('Order created');
            setFormOpen(false);
            actionRef.current?.reload();
            setInitialOrderValues(undefined);
            history.replace('/billing/orders');
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Create failed');
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
        }}
        title={`Order ${selectedOrder?.orderNumber || selectedOrder?.id || ''}`}
        styles={{
          body: {
            paddingTop: 0,
          },
        }}
      >
        {selectedOrder && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Customer">
                {selectedOrder.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  status={statusColors[selectedOrder.status]}
                  text={selectedOrder.status}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Invoice">
                {selectedOrder.invoiceId ? (
                  <Space size={8}>
                    <a onClick={() => openInvoicePdf(selectedOrder.invoiceId!)}>
                      {selectedOrder.invoiceNumber ||
                        `Invoice #${selectedOrder.invoiceId}`}
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
                        message.success('Invoice created');
                        // refresh order to get invoice linkage
                        const refreshed = await getOrder(selectedOrder.id);
                        setSelectedOrder(refreshed.data);
                        actionRef.current?.reload();
                      } catch (err: any) {
                        const msg =
                          err?.data?.message ||
                          err?.response?.data?.message ||
                          err?.message ||
                          'Invoice creation failed';
                        message.error(msg);
                      }
                    }}
                  >
                    {selectedOrder.status !== 'DRAFT'
                      ? 'Order already invoiced'
                      : canCreateInvoice
                      ? 'Create Invoice'
                      : 'Add items to invoice'}
                  </Button>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Currency">
                {selectedOrder.currency}
              </Descriptions.Item>
              <Descriptions.Item label="Default VAT">
                {selectedOrder.defaultVatRate}
              </Descriptions.Item>
              <Descriptions.Item label="Total Net">
                {selectedOrder.totalNet}
              </Descriptions.Item>
              <Descriptions.Item label="Total Gross">
                {selectedOrder.totalGross}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
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
                    label="Price List Item"
                    rules={[{ required: true, message: 'Select item' }]}
                    style={{ margin: 0, width: 280 }}
                  >
                    <Select
                      showSearch
                      allowClear
                      filterOption={false}
                      placeholder="Select service"
                      options={priceOptions}
                      onSearch={(v) => fetchPriceOptions(v)}
                    />
                  </Form.Item>
                  <Form.Item
                    name="quantity"
                    label="Quantity"
                    rules={[{ required: true, message: 'Qty required' }]}
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
                    label="Discount %"
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
                      Add
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
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    Unit
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    Discount %
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    Unit Net
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    Net
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #303030',
                      background: '#1f1f1f',
                    }}
                  >
                    Gross
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
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #303030',
                        textAlign: 'right',
                      }}
                    >
                      {item.discountPercent ?? 0}
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
                              message.success('Item removed');
                              actionRef.current?.reload();
                            } catch (err: any) {
                              message.error(
                                err?.data?.message || 'Remove failed',
                              );
                            }
                          }}
                        >
                          Remove
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
        title={`Customer: ${customerDetails?.name || ''}`}
      >
        {customerDetails ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">
              {customerDetails.name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {customerDetails.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {customerDetails.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="City">
              {customerDetails.city || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Country">
              {customerDetails.countryCode || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Terms (days)">
              {customerDetails.paymentTermsDays ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="VAT ID">
              {customerDetails.vatId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tax Number">
              {customerDetails.taxNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Address">
              {customerDetails.street || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Postal Code">
              {customerDetails.postalCode || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes">
              {customerDetails.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Orders">
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
                View orders for this customer
              </a>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div>No customer data.</div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default OrdersPage;
