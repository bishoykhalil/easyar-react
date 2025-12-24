import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerDTO,
} from '@/services/customers';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';
import CustomerForm from './components/CustomerForm';

const CustomersPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDTO | undefined>(undefined);

  const columns: ProColumns<CustomerDTO>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
    },
    {
      title: 'City',
      dataIndex: 'city',
    },
    {
      title: 'Country',
      dataIndex: 'countryCode',
      width: 90,
    },
    {
      title: 'Payment Terms (days)',
      dataIndex: 'paymentTermsDays',
      width: 140,
    },
    {
      title: 'Actions',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setEditing(record);
            setFormOpen(true);
          }}
        >
          Edit
        </a>,
        <Popconfirm
          key="delete"
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
        </Popconfirm>,
      ],
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
