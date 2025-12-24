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
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Descriptions,
  Divider,
  Drawer,
  message,
  Popconfirm,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import OrderForm from './components/OrderForm';
import OrderItemForm from './components/OrderItemForm';

const statusColors: Record<
  OrderStatus,
  'processing' | 'success' | 'default' | 'warning' | 'error'
> = {
  DRAFT: 'default',
  CONFIRMED: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const OrdersPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<
    OrderResponseDTO | undefined
  >(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });

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
      message.error(err?.data?.message || 'Status update failed');
    }
  };

  const handleAddItem = async (values: any) => {
    if (!selectedOrder) return false;
    try {
      const res = await addItem(selectedOrder.id, values);
      message.success('Item added');
      setSelectedOrder(res.data);
      actionRef.current?.reload();
      return true;
    } catch (err: any) {
      message.error(err?.data?.message || 'Add item failed');
      return false;
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
          actions: [
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
        onFinish={async (values) => {
          try {
            await createOrder(values);
            message.success('Order created');
            setFormOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Create failed');
            return false;
          }
        }}
      />

      <OrderItemForm
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        onFinish={handleAddItem}
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
            <Space style={{ marginBottom: 12 }}>
              {selectedOrder.status === 'DRAFT' && (
                <Button
                  type="primary"
                  onClick={() => {
                    setItemFormOpen(true);
                  }}
                >
                  Add Item
                </Button>
              )}
            </Space>
            <div>
              {selectedOrder.items?.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <strong>{item.name}</strong>
                      <Tag>{item.unit}</Tag>
                    </Space>
                    <div>{item.description}</div>
                    <Space>
                      <span>Qty: {item.quantity}</span>
                      <span>Unit: {item.unitPriceNet}</span>
                      <span>VAT: {item.vatRate}</span>
                      <span>Net: {item.lineNet}</span>
                      <span>Gross: {item.lineGross}</span>
                    </Space>
                    {selectedOrder.status === 'DRAFT' && item.id && (
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
                    )}
                  </Space>
                </div>
              ))}
            </div>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default OrdersPage;
