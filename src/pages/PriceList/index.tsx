import {
  createPriceItem,
  disablePriceItem,
  listPriceItemsPaged,
  updatePriceItem,
  type PriceListItemDTO,
} from '@/services/pricelist';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { AutoComplete, Badge, Button, message, Popconfirm, Space } from 'antd';
import React, { useRef, useState } from 'react';
import PriceItemForm from './components/PriceItemForm';

const PriceListPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PriceListItemDTO | undefined>(
    undefined,
  );
  const [nameOptions, setNameOptions] = useState<{ value: string }[]>([]);

  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });

  const columns: ProColumns<PriceListItemDTO>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      // autocomplete search for name
      renderFormItem: (_, __, form) => (
        <AutoComplete
          allowClear
          options={nameOptions}
          placeholder="Search name"
          onSearch={async (value) => {
            try {
              const res = await listPriceItemsPaged({
                q: value && value.trim().length > 0 ? value : '%',
                page: 0,
                size: 5,
              });
              const opts =
                res.data?.content
                  ?.map((i) => i.name)
                  .filter(Boolean)
                  .filter((v, idx, arr) => arr.indexOf(v) === idx)
                  .map((v) => ({ value: v! })) || [];
              setNameOptions(opts);
            } catch {
              // ignore autocomplete errors
            }
          }}
          onSelect={(val) => form?.setFieldValue?.('name', val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      width: 120,
      hideInSearch: true,
    },
    {
      title: 'Net Price',
      dataIndex: 'priceNet',
      width: 140,
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      hideInSearch: true,
    },
    {
      title: 'VAT Rate',
      dataIndex: 'vatRate',
      renderText: (val) =>
        val !== undefined ? `${Math.round(val * 100)}%` : '',
      width: 110,
      hideInSearch: true,
    },
    {
      title: 'Active',
      dataIndex: 'active',
      width: 90,
      render: (_, record) =>
        record.active ? (
          <Badge status="success" text="Yes" />
        ) : (
          <Badge status="default" text="No" />
        ),
      valueType: 'select',
      valueEnum: {
        true: { text: 'Active' },
        false: { text: 'Inactive' },
      },
    },
    {
      title: 'Actions',
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <a
            onClick={() => {
              setEditing(record);
              setFormOpen(true);
            }}
          >
            Edit
          </a>
          {record.active && (
            <Popconfirm
              title="Disable this item?"
              onConfirm={async () => {
                try {
                  await disablePriceItem(record.id!);
                  message.success('Disabled');
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(err?.data?.message || 'Disable failed');
                }
              }}
            >
              <a style={{ color: 'red' }}>Disable</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const buildSort = (sorter: any) => {
    if (!sorter || Array.isArray(sorter) || Object.keys(sorter).length === 0)
      return undefined;
    const [first] = Object.entries(sorter);
    if (!first) return undefined;
    const [field, order] = first;
    if (!field || !order) return undefined;
    const dir = order === 'ascend' ? 'asc' : 'desc';
    return `${field},${dir}`;
  };

  return (
    <PageContainer>
      <ProTable<PriceListItemDTO>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={{
          labelWidth: 90,
          span: 6,
        }}
        request={async (params, sorter) => {
          try {
            const res = await listPriceItemsPaged({
              q: params.name || params.keyword || '%',
              onlyActive:
                params.active === undefined
                  ? undefined
                  : params.active === 'true' || params.active === true,
              page: (params.current || 1) - 1,
              size: params.pageSize || 10,
              sort: buildSort(sorter),
            });
            const data = res.data;
            return {
              data: data?.content || [],
              success: true,
              total: data?.totalElements || 0,
            };
          } catch (err: any) {
            message.error(err?.data?.message || 'Failed to load price list');
            return { data: [], success: false };
          }
        }}
        toolbar={{
          title: 'Price List',
          actions: [
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              New Item
            </Button>,
          ],
        }}
      />

      <PriceItemForm
        open={formOpen}
        initialValues={editing}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(undefined);
        }}
        onFinish={async (values) => {
          try {
            if (editing?.id) {
              await updatePriceItem(editing.id, values);
            } else {
              await createPriceItem(values);
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

export default PriceListPage;
