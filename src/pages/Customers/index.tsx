import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerDTO,
} from '@/services/customers';
import { createOrder } from '@/services/orders';
import { formatCustomerLabel } from '@/utils/customers';
import {
  PageContainer,
  ProFormSelect,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, message, Popconfirm, Space } from 'antd';
import React, { useRef, useState } from 'react';
import OrderForm from '../Orders/components/OrderForm';
import CustomerDetailsDrawer from './components/CustomerDetailsDrawer';
import CustomerForm from './components/CustomerForm';

const CustomersPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDTO | undefined>(undefined);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderInitial, setOrderInitial] = useState<any>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<
    CustomerDTO | undefined
  >(undefined);

  const columns: ProColumns<CustomerDTO>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      ellipsis: true,
      renderFormItem: (_, { type, ...rest }) => {
        if (type === 'form') return null;
        return (
          <ProFormSelect
            {...rest}
            showSearch
            allowClear
            placeholder="Search name"
            debounceTime={300}
            request={async ({ keyWords }) => {
              const res = await listCustomers({
                search: keyWords && keyWords.trim().length > 0 ? keyWords : '%',
              });
              const map = new Map<string, string>();
              (res.data || []).forEach((c) => {
                if (c.name && !map.has(c.name)) {
                  map.set(c.name, formatCustomerLabel(c.name, c.city));
                }
              });
              return Array.from(map.entries()).map(([value, label]) => ({
                label,
                value,
              }));
            }}
          />
        );
      },
    },
    {
      title: 'City',
      dataIndex: 'city',
      renderFormItem: (_, { type, ...rest }) => {
        if (type === 'form') return null;
        return (
          <ProFormSelect
            {...rest}
            showSearch
            allowClear
            placeholder="Search city"
            debounceTime={300}
            request={async ({ keyWords }) => {
              const res = await listCustomers({
                search: keyWords && keyWords.trim().length > 0 ? keyWords : '%',
              });
              const cities = Array.from(
                new Set(
                  (res.data || [])
                    .map((c) => c.city)
                    .filter((n): n is string => !!n),
                ),
              );
              return cities.map((n) => ({ label: n, value: n }));
            }}
          />
        );
      },
    },
    {
      title: 'Actions',
      valueType: 'option',
      render: (_, record) => (
        <Space size={12}>
          <a
            onClick={() => {
              setEditing(record);
              setFormOpen(true);
            }}
          >
            Edit
          </a>
          <Popconfirm
            title="Delete customer?"
            onConfirm={async () => {
              try {
                await deleteCustomer(record.id!);
                message.success('Deleted');
                actionRef.current?.reload();
              } catch (err: any) {
                message.error(err?.data?.message || 'Delete failed');
              }
            }}
          >
            <a style={{ color: 'red' }}>Delete</a>
          </Popconfirm>
          <a
            onClick={() => {
              setSelectedCustomer(record);
              setDetailsOpen(true);
            }}
          >
            Details
          </a>
          <a
            onClick={() => {
              history.push(
                `/billing/orders?customerId=${
                  record.id
                }&customerName=${encodeURIComponent(record.name)}&new=1`,
              );
            }}
          >
            New Order
          </a>
          <Button
            type="link"
            disabled={!record.orderCount}
            onClick={() => {
              history.push(
                `/billing/orders?customerId=${
                  record.id
                }&customerName=${encodeURIComponent(record.name)}`,
              );
            }}
            style={{ padding: 0 }}
          >
            View Orders
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<CustomerDTO>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          try {
            const searchTerm =
              params.name ||
              params.email ||
              params.phone ||
              params.city ||
              params.countryCode ||
              (params.paymentTermsDays
                ? String(params.paymentTermsDays)
                : undefined) ||
              params.keyword ||
              '%';
            const res = await listCustomers({
              search: searchTerm,
            });
            return {
              data: res.data || [],
              success: true,
              total: res.data?.length || 0,
            };
          } catch (err: any) {
            message.error(err?.data?.message || 'Failed to load customers');
            return { data: [], success: false };
          }
        }}
        toolbar={{
          title: 'Customers',
          actions: [
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              New Customer
            </Button>,
          ],
        }}
      />

      <OrderForm
        open={orderFormOpen}
        initialValues={orderInitial}
        onOpenChange={(v) => {
          setOrderFormOpen(v);
          if (!v) setOrderInitial(undefined);
        }}
        onFinish={async (values) => {
          try {
            await createOrder(values);
            message.success('Order created');
            setOrderFormOpen(false);
            setOrderInitial(undefined);
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Create order failed');
            return false;
          }
        }}
      />

      <CustomerDetailsDrawer
        open={detailsOpen}
        customer={selectedCustomer}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedCustomer(undefined);
        }}
      />

      <CustomerForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(undefined);
        }}
        initialValues={editing}
        onFinish={async (values) => {
          try {
            if (editing?.id) {
              await updateCustomer(editing.id, values);
            } else {
              await createCustomer(values);
            }
            message.success(editing?.id ? 'Updated' : 'Created');
            actionRef.current?.reload();
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Save failed');
            return false;
          }
        }}
      />
    </PageContainer>
  );
};

export default CustomersPage;
