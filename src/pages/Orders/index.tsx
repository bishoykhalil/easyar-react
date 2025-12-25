import { createFromOrder, downloadInvoicePdf } from '@/services/invoices';
import {
  addItem,
  createOrder,
  deleteOrder,
  getOrder,
  listOrdersPaged,
  removeItem,
  updateStatus,
  type OrderResponseDTO,
  type OrderStatus,
} from '@/services/orders';
import { listPriceItemsPaged } from '@/services/pricelist';
import {
  PageContainer,
  ProTable,
  type ProColumns,
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
  Select,
  Space,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import OrderForm from './components/OrderForm';

const statusColors: Record<
  OrderStatus,
  'processing' | 'success' | 'default' | 'warning' | 'error'
> = {
  DRAFT: 'default',
  CONFIRMED: 'processing',
  INVOICED: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const OrdersPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [initialOrderValues, setInitialOrderValues] = useState<any>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<
    OrderResponseDTO | undefined
  >(undefined);
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
      render: (_, record) => record.orderNumber || `#${record.id}`,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => (
        <Badge status={statusColors[record.status]} text={record.status} />
      ),
      valueType: 'select',
      valueEnum: {
        DRAFT: { text: 'DRAFT' },
        CONFIRMED: { text: 'CONFIRMED' },
        INVOICED: { text: 'INVOICED' },
        COMPLETED: { text: 'COMPLETED' },
        CANCELLED: { text: 'CANCELLED' },
      },
    },
    {
      title: 'Net',
      dataIndex: 'totalNet',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
    },
    {
      title: 'Gross',
      dataIndex: 'totalGross',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: 'Actions',
      valueType: 'option',
      render: (_, record) => (
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
      ),
    },
  ];

  const handleStatusChange = async (orderId: number, status: OrderStatus) => {
    try {
      const res = await updateStatus(orderId, status);
      message.success('Status updated');
      setSelectedOrder(res.data);
      actionRef.current?.reload();
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Status update failed';
      message.error(msg);
    }
  };

  const handleAddItem = async (values: any) => {
    if (!selectedOrder) return false;
    try {
      setAdding(true);
      const payload: any = { ...values };
      const opt = priceOptions.find((p) => p.value === values.priceListItemId);
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

  return (
    <PageContainer>
      <ProTable<OrderResponseDTO>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={{
          labelWidth: 90,
          span: 6,
        }}
        request={async (params) => {
          try {
            const res = await listOrdersPaged({
              q: params.keyword,
              status: params.status,
              customerId: filterCustomerId,
              page: (params.current || 1) - 1,
              size: params.pageSize || 10,
              sort: undefined,
            });
            const data = res.data;
            return {
              data: data?.content || [],
              success: true,
              total: data?.totalElements || 0,
            };
          } catch (err: any) {
            message.error(err?.data?.message || 'Failed to load orders');
            return { data: [], success: false };
          }
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
      >
        {selectedOrder && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Customer">
                {selectedOrder.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Space>
                  <Badge
                    status={statusColors[selectedOrder.status]}
                    text={selectedOrder.status}
                  />
                  {selectedOrder.status === 'DRAFT' && (
                    <Space size={4}>
                      <a
                        onClick={() =>
                          handleStatusChange(selectedOrder.id, 'CONFIRMED')
                        }
                      >
                        Confirm
                      </a>
                    </Space>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <Space size={4}>
                      <a
                        onClick={() =>
                          handleStatusChange(selectedOrder.id, 'INVOICED')
                        }
                      >
                        Mark Invoiced
                      </a>
                    </Space>
                  )}
                  {selectedOrder.status === 'INVOICED' && (
                    <Space size={4}>
                      <a
                        onClick={() =>
                          handleStatusChange(selectedOrder.id, 'COMPLETED')
                        }
                      >
                        Complete
                      </a>
                    </Space>
                  )}
                  {(selectedOrder.status === 'DRAFT' ||
                    selectedOrder.status === 'CONFIRMED') && (
                    <Space size={4}>
                      <a
                        onClick={() =>
                          handleStatusChange(selectedOrder.id, 'CANCELLED')
                        }
                      >
                        Cancel
                      </a>
                    </Space>
                  )}
                </Space>
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
                    disabled={selectedOrder.status !== 'CONFIRMED'}
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
                    {selectedOrder.status === 'CONFIRMED'
                      ? 'Create Invoice'
                      : 'Confirm order to invoice'}
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
                    <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
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
    </PageContainer>
  );
};

export default OrdersPage;
