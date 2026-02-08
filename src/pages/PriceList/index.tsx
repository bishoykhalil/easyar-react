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
import { getLocale, useIntl } from '@umijs/max';
import {
  AutoComplete,
  Badge,
  Button,
  Dropdown,
  message,
  Popconfirm,
  Space,
} from 'antd';
import React, { useRef, useState } from 'react';
import PriceItemForm from './components/PriceItemForm';

const PriceListPage: React.FC = () => {
  const actionRef = useRef<any>();
  const intl = useIntl();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PriceListItemDTO | undefined>(
    undefined,
  );
  const [nameOptions, setNameOptions] = useState<{ value: string }[]>([]);
  const [descriptionOptions, setDescriptionOptions] = useState<
    { value: string }[]
  >([]);
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState<any>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRowsById, setSelectedRowsById] = useState<
    Record<string, PriceListItemDTO>
  >({});

  const money = new Intl.NumberFormat(getLocale(), {
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

  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, any>,
  ) => intl.formatMessage({ id, defaultMessage }, values);

  const columns: ProColumns<PriceListItemDTO>[] = [
    {
      title: t('table.name', 'Name'),
      dataIndex: 'name',
      // autocomplete search for name
      renderFormItem: (_, __, form) => (
        <AutoComplete
          allowClear
          options={nameOptions}
          placeholder={t('placeholder.searchName', 'Search name')}
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
      title: t('table.description', 'Description'),
      dataIndex: 'description',
      ellipsis: true,
      width: 280,
      renderFormItem: (_, __, form) => (
        <AutoComplete
          allowClear
          options={descriptionOptions}
          placeholder={t('placeholder.searchDescription', 'Search description')}
          onSearch={async (value) => {
            try {
              const res = await listPriceItemsPaged({
                q: value && value.trim().length > 0 ? value : '%',
                page: 0,
                size: 8,
              });
              const opts =
                res.data?.content
                  ?.map((i) => i.description)
                  .filter(Boolean)
                  .map((v) => v!.trim())
                  .filter((v) => v.length > 0)
                  .filter((v, idx, arr) => arr.indexOf(v) === idx)
                  .map((v) => ({ value: v })) || [];
              setDescriptionOptions(opts);
            } catch {
              // ignore autocomplete errors
            }
          }}
          onSelect={(val) => form?.setFieldValue?.('description', val)}
        />
      ),
    },
    {
      title: t('table.unit', 'Unit'),
      dataIndex: 'unit',
      width: 120,
      hideInSearch: true,
    },
    {
      title: t('table.netPrice', 'Net Price'),
      dataIndex: 'priceNet',
      width: 140,
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      hideInSearch: true,
    },
    {
      title: t('table.vatRate', 'VAT Rate'),
      dataIndex: 'vatRate',
      renderText: (val) =>
        val !== undefined ? `${Math.round(val * 100)}%` : '',
      width: 110,
      hideInSearch: true,
    },
    {
      title: t('table.active', 'Active'),
      dataIndex: 'active',
      width: 90,
      render: (_, record) =>
        record.active ? (
          <Badge status="success" text={t('status.yes', 'Yes')} />
        ) : (
          <Badge status="default" text={t('status.no', 'No')} />
        ),
      valueType: 'select',
      valueEnum: {
        true: { text: t('status.active', 'Active') },
        false: { text: t('status.inactive', 'Inactive') },
      },
    },
    {
      title: t('table.actions', 'Actions'),
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <a
            onClick={() => {
              setEditing(record);
              setFormOpen(true);
            }}
          >
            {t('action.edit', 'Edit')}
          </a>
          {record.active ? (
            <Popconfirm
              title={t(
                'message.priceListItemDisableConfirm',
                'Disable this item?',
              )}
              onConfirm={async () => {
                try {
                  await disablePriceItem(record.id!);
                  message.success(t('message.disableSuccess', 'Disabled'));
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(
                    err?.data?.message ||
                      t('message.disableFailed', 'Disable failed'),
                  );
                }
              }}
            >
              <a style={{ color: 'red' }}>{t('action.disable', 'Disable')}</a>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={t(
                'message.priceListItemEnableConfirm',
                'Enable this item?',
              )}
              onConfirm={async () => {
                try {
                  await updatePriceItem(record.id!, {
                    name: record.name,
                    description: record.description,
                    unit: record.unit,
                    priceNet: record.priceNet,
                    vatRate: record.vatRate,
                    active: true,
                  });
                  message.success(t('message.enableSuccess', 'Enabled'));
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(
                    err?.data?.message ||
                      t('message.enableFailed', 'Enable failed'),
                  );
                }
              }}
            >
              <a style={{ color: '#22c55e' }}>{t('action.enable', 'Enable')}</a>
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

  const generatePriceListPdf = async (items: PriceListItemDTO[]) => {
    try {
      setDownloading(true);
      // fetch settings for header (with cache)
      const settingsData = await fetchSettingsOnce();
      const activeItems = (items || []).filter((i) => i.active);

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF();
      const marginLeft = 14;
      const marginTop = 16;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - marginLeft * 2;
      const lineHeight = 5;

      const drawMultiline = (
        text: string,
        x: number,
        y: number,
        maxW: number,
      ) => {
        const normalized = String(text || '')
          .replace(/\r\n/g, '\n')
          .trim();
        if (!normalized) return y;
        const lines = doc.splitTextToSize(normalized, maxW);
        doc.text(lines, x, y);
        return y + lines.length * lineHeight;
      };

      doc.setFontSize(18);
      doc.text(
        t('pdf.priceListTitle', 'Price List Offer'),
        marginLeft,
        marginTop,
      );

      // Right-aligned timestamp to avoid collisions with the header block.
      doc.setFontSize(10);
      doc.text(
        `${t('pdf.generated', 'Generated')}: ${new Date().toLocaleString(
          getLocale() || undefined,
        )}`,
        pageWidth - marginLeft,
        marginTop + 8,
        { align: 'right' },
      );

      const companyName = settingsData?.companyName || 'Company';
      const companyAddress = settingsData?.companyAddress || '';
      const contactInfo = settingsData?.contactInfo || '';

      let y = marginTop + 16;
      doc.setFontSize(12);
      // @ts-expect-error - jsPDF typings vary by version; runtime supports setFont.
      doc.setFont(undefined, 'bold');
      doc.text(companyName, marginLeft, y);
      y += 7;
      // @ts-expect-error - jsPDF typings vary by version; runtime supports setFont.
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      // Stack blocks with dynamic height to prevent overlap.
      y = drawMultiline(companyAddress, marginLeft, y, contentWidth);
      if (companyAddress) y += 2;
      y = drawMultiline(contactInfo, marginLeft, y, contentWidth);
      if (contactInfo) y += 2;
      // Price list offer PDF: keep header minimal (no bank details).

      autoTable(doc, {
        startY: y + 6,
        head: [
          [
            t('table.name', 'Name'),
            t('table.unit', 'Unit'),
            `${t('table.netPrice', 'Net Price')} (€)`,
            t('table.vatRate', 'VAT Rate'),
          ],
        ],
        body: activeItems.map((item) => [
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
      message.error(
        err?.message ||
          t('message.failedToGeneratePdf', 'Failed to generate PDF'),
      );
    } finally {
      setDownloading(false);
    }
  };

  const fetchAllActiveItems = async () => {
    // coarse paging to avoid many requests
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
    return all;
  };

  const downloadAllActivePdf = async () => {
    const all = await fetchAllActiveItems();
    await generatePriceListPdf(all);
  };

  const downloadSelectedPdf = async () => {
    const items = Object.values(selectedRowsById).filter((i) => i.active);
    if (!items.length) {
      message.warning(
        t('message.selectAtLeastOneItem', 'Select at least one item'),
      );
      return;
    }
    await generatePriceListPdf(items);
  };

  return (
    <PageContainer>
      <ProTable<PriceListItemDTO>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          preserveSelectedRowKeys: true,
          getCheckboxProps: (record) => ({
            disabled: !record.active,
          }),
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRowsById((prev) => {
              const keySet = new Set(keys.map((k) => String(k)));
              const next = { ...prev };
              // remove de-selected
              Object.keys(next).forEach((id) => {
                if (!keySet.has(String(id))) delete next[id];
              });
              // upsert selected from current page
              rows.forEach((r) => {
                if (r.id !== undefined && r.id !== null) {
                  next[String(r.id)] = r;
                }
              });
              return next;
            });
          },
        }}
        search={{
          labelWidth: 90,
          span: 6,
        }}
        request={async (params, sorter) => {
          try {
            const qParts = [params.name, params.description]
              .filter((v) => typeof v === 'string' && v.trim().length > 0)
              .map((v) => v.trim());

            const activeFilterRaw = params.active;
            const activeFilter =
              activeFilterRaw === undefined || activeFilterRaw === null
                ? undefined
                : activeFilterRaw === 'true' || activeFilterRaw === true
                ? true
                : activeFilterRaw === 'false' || activeFilterRaw === false
                ? false
                : undefined;
            const res = await listPriceItemsPaged({
              q: qParts.length ? qParts.join(' ') : params.keyword || '%',
              // backend supports `onlyActive=true` for active rows; for inactive we also
              // try `active=false` (some backends ignore `onlyActive=false`).
              onlyActive: activeFilter === true ? true : undefined,
              ...(activeFilter === false ? ({ active: false } as any) : {}),
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
            message.error(
              err?.data?.message ||
                t('message.failedToLoadPriceList', 'Failed to load price list'),
            );
            return { data: [], success: false };
          }
        }}
        toolbar={{
          title: t('page.priceList', 'Price List'),
          actions: [
            <Dropdown.Button
              key="download"
              onClick={downloadAllActivePdf}
              loading={downloading}
              menu={{
                items: [
                  {
                    key: 'all',
                    label: t('action.downloadAllActive', 'Download all active'),
                    onClick: downloadAllActivePdf,
                  },
                  {
                    key: 'selected',
                    label: t(
                      'action.downloadSelected',
                      'Download selected ({count})',
                      { count: selectedRowKeys.length },
                    ),
                    disabled: selectedRowKeys.length === 0,
                    onClick: downloadSelectedPdf,
                  },
                ],
              }}
            >
              {t('action.downloadPriceListPdf', 'Download Price List PDF')}
            </Dropdown.Button>,
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              {t('action.newItem', 'New Item')}
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
            message.error(
              err?.data?.message || t('message.saveFailed', 'Save failed'),
            );
            return false;
          }
        }}
      />
    </PageContainer>
  );
};

export default PriceListPage;
