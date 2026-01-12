import {
  createPriceItem,
  disablePriceItem,
  listPriceItemsPaged,
  updatePriceItem,
  type PriceListItemDTO,
} from '@/services/pricelist';
import { getSettings } from '@/services/settings';
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
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState<any>();

  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });

  const fetchSettingsOnce = async () => {
    if (settings) return settings;
    try {
      const res = await getSettings();
      setSettings(res.data);
      return res.data;
    } catch {
      return {};
    }
  };

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
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      width: 280,
      hideInSearch: true,
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

  const downloadPriceListPdf = async () => {
    try {
      setDownloading(true);
      // fetch settings for header (with cache)
      const settingsData = await fetchSettingsOnce();
      // fetch all active items (coarse paging to avoid many requests)
      let page = 0;
      const size = 200;
      let all: PriceListItemDTO[] = [];
      // limit to avoid infinite loop
      for (let i = 0; i < 10; i++) {
        const res = await listPriceItemsPaged({
          q: '%',
          onlyActive: true,
          page,
          size,
        });
        const data = res.data;
        if (data?.content) {
          all = all.concat(data.content);
        }
        if (!data || data.last || data.content.length < size) break;
        page += 1;
      }

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF();
      const marginLeft = 14;
      const marginTop = 16;
      doc.setFontSize(18);
      doc.text('Price List Offer', marginLeft, marginTop);

      doc.setFontSize(11);
      const companyLine = settingsData?.companyName || 'Company';
      const addrLine = settingsData?.companyAddress || '';
      const contactLine = settingsData?.contactInfo || '';
      const infoStartY = marginTop + 8;
      doc.text(companyLine, marginLeft, infoStartY);
      if (addrLine) {
        doc.text(addrLine, marginLeft, infoStartY + 6);
      }
      if (contactLine) {
        doc.text(contactLine, marginLeft, infoStartY + 12);
      }
      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        marginLeft,
        infoStartY + 20,
      );

      autoTable(doc, {
        startY: infoStartY + 26,
        head: [['Name', 'Unit', 'Net Price (€)', 'VAT']],
        body: all.map((item) => [
          item.name || '',
          item.unit || '',
          item.priceNet !== undefined ? money.format(item.priceNet) : '',
          item.vatRate !== undefined
            ? `${Math.round(item.vatRate * 100)}%`
            : '',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [33, 150, 243] },
      });

      doc.save('price-list.pdf');
    } catch (err: any) {
      message.error(err?.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
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
              key="download"
              onClick={downloadPriceListPdf}
              loading={downloading}
            >
              Download Price List PDF
            </Button>,
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
