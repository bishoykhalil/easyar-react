import { getCustomer, type CustomerDTO } from '@/services/customers';
import {
  createFromOrder,
  createReminderInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  listInvoicesPaged,
  updateInvoice,
  updateInvoiceStatus,
  type InvoiceResponseDTO,
  type InvoiceStatus,
} from '@/services/invoices';
import {
  listPriceItemsPaged,
  type PriceListItemDTO,
} from '@/services/pricelist';
import { createPlanFromInvoice } from '@/services/recurring';
import { formatPriceItemLabel } from '@/utils/priceList';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RollbackOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ProFormInstance,
} from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import CreateInvoiceForm from './components/CreateInvoiceForm';

const statusColors: Record<
  InvoiceStatus,
  'default' | 'processing' | 'success' | 'error' | 'warning'
> = {
  ISSUED: 'processing',
  SENT: 'processing',
  PAID: 'success',
  RETURNED: 'warning',
  OVERDUE: 'error',
};

const money = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'EUR',
});
const formatPercent = (val?: number) => {
  const pct = Math.round(((val ?? 0) * 100 + Number.EPSILON) * 100) / 100;
  const text = pct.toFixed(2).replace(/\.00$/, '');
  return `${text}%`;
};
const formatDate = (val?: string) =>
  val ? new Date(val).toISOString().slice(0, 10) : '-';
const formatDateTime = (val?: string) =>
  val ? new Date(val).toISOString().replace('T', ' ').slice(0, 16) : '-';

const InvoicesPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<InvoiceResponseDTO | undefined>(
    undefined,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planInvoice, setPlanInvoice] = useState<
    InvoiceResponseDTO | undefined
  >(undefined);
  const [planForm] = Form.useForm();
  const [editingInvoice, setEditingInvoice] = useState<
    InvoiceResponseDTO | undefined
  >(undefined);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editRows, setEditRows] = useState<any[]>([]);
  const [priceOptions, setPriceOptions] = useState<PriceListItemDTO[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [addPriceId, setAddPriceId] = useState<number | undefined>(undefined);
  const [addQty, setAddQty] = useState<number>(1);
  const [addDiscount, setAddDiscount] = useState<number>(0);
  const [customerDetails, setCustomerDetails] = useState<CustomerDTO | null>(
    null,
  );
  const [customerLoading, setCustomerLoading] = useState(false);
  const formRef = useRef<ProFormInstance>();
  const location = useLocation();

  const openPlanModal = async (record: InvoiceResponseDTO) => {
    try {
      if (record.status === 'RETURNED' || record.status === 'OVERDUE') {
        message.error('Cannot create plan from returned/overdue invoice');
        return;
      }
      setCreatingPlan(true);
      const res = await getInvoice(record.id);
      if (!res.data?.items || res.data.items.length === 0) {
        message.error('Invoice has no items to create a plan');
        setCreatingPlan(false);
        return;
      }
      setPlanInvoice(res.data);
      setPlanModalOpen(true);
      const today = dayjs();
      planForm.setFieldsValue({
        startDate: today,
        nextRunDate: today,
        maxOccurrences: 12,
        frequency: 'MONTHLY',
        notes: `Created from invoice ${res.data.invoiceNumber || res.data.id}`,
      });
    } catch (err: any) {
      const backendMsg = err?.data?.message || err?.response?.data?.message;
      const msg =
        backendMsg || err?.message || 'Failed to create recurring plan';
      message.error(msg);
    } finally {
      setCreatingPlan(false);
    }
  };

  const openEditModal = async (record: InvoiceResponseDTO) => {
    try {
      setSavingEdit(true);
      const res = await getInvoice(record.id);
      const items = (res.data?.items || []).map((item) => ({
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity ?? 0,
        unitPriceNet: item.unitPriceNet ?? 0,
        vatRate: item.vatRate ?? 0,
        discountPercent: item.discountPercent ?? 0,
      }));
      setEditingInvoice(res.data);
      setEditRows(items);
      setAddPriceId(undefined);
      setAddQty(1);
      setAddDiscount(0);
      setEditModalOpen(true);
    } catch (err: any) {
      const backendMsg = err?.data?.message || err?.response?.data?.message;
      message.error(backendMsg || 'Failed to load invoice for edit');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateReminder = async (record: InvoiceResponseDTO) => {
    try {
      const res = await createReminderInvoice(record.id);
      message.success('Reminder invoice created');
      actionRef.current?.reload();
      if (res.data) {
        setSelected(res.data);
        setDrawerOpen(true);
      }
    } catch (err: any) {
      const backendMsg = err?.data?.message || err?.response?.data?.message;
      message.error(backendMsg || 'Failed to create reminder invoice');
    }
  };

  const openPdf = async (id: number) => {
    try {
      const blob = await downloadInvoicePdf(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      message.error(err?.data?.message || 'Failed to download PDF');
    }
  };

  const columns: ProColumns<InvoiceResponseDTO>[] = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      render: (_, r) => r.invoiceNumber || `#${r.id}`,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, r) => (
        <Badge status={statusColors[r.status]} text={r.status} />
      ),
      valueType: 'select',
      valueEnum: {
        ISSUED: { text: 'ISSUED' },
        SENT: { text: 'SENT' },
        PAID: { text: 'PAID' },
        RETURNED: { text: 'RETURNED' },
        OVERDUE: { text: 'OVERDUE' },
      },
    },
    {
      title: 'Net',
      dataIndex: 'totalNet',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      hideInSearch: true,
    },
    {
      title: 'Gross',
      dataIndex: 'totalGross',
      renderText: (val) => (val !== undefined ? money.format(val) : ''),
      hideInSearch: true,
    },
    {
      title: 'Recurring',
      dataIndex: 'recurring',
      render: (_, r) =>
        r.recurring ? <Tag color="blue">Recurring</Tag> : <Tag>One-off</Tag>,
      valueType: 'select',
      valueEnum: {
        true: { text: 'Recurring' },
        false: { text: 'One-off' },
      },
    },
    {
      title: 'Overdue',
      dataIndex: 'overdue',
      render: (_, r) =>
        r.overdue ? (
          <Badge status="error" text={`Yes (${r.daysOverdue}d)`} />
        ) : (
          <Badge status="success" text="No" />
        ),
      valueType: 'select',
      valueEnum: {
        true: { text: 'Overdue' },
        false: { text: 'Not Overdue' },
      },
    },
    {
      title: 'Issued At',
      dataIndex: 'issuedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: 'Paid At',
      dataIndex: 'paidAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      valueType: 'date',
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
                const res = await getInvoice(record.id);
                setSelected(res.data);
                setDrawerOpen(true);
              } catch (err: any) {
                message.error(err?.data?.message || 'Failed to load invoice');
              }
            }}
          >
            View
          </a>
          <a onClick={() => openPdf(record.id)}>PDF</a>
          {record.recurring ? null : (
            <Button
              size="small"
              type="link"
              loading={creatingPlan}
              onClick={() => openPlanModal(record)}
            >
              Create Plan
            </Button>
          )}
          {record.status === 'OVERDUE' && (
            <Button
              size="small"
              type="link"
              onClick={() => handleCreateReminder(record)}
            >
              Reminder Invoice
            </Button>
          )}
          {record.status === 'ISSUED' && (
            <Popconfirm
              title="Delete invoice?"
              onConfirm={async () => {
                try {
                  await deleteInvoice(record.id);
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

  const handleStatusChange = async (id: number, status: InvoiceStatus) => {
    try {
      const res = await updateInvoiceStatus(id, status);
      setSelected(res.data);
      message.success('Status updated');
      actionRef.current?.reload();
    } catch (err: any) {
      message.error(err?.data?.message || 'Status update failed');
    }
  };

  const handleEditSave = async () => {
    if (!editingInvoice) return;
    try {
      setSavingEdit(true);
      if (!editRows.length) {
        message.error('At least one item is required');
        return;
      }
      for (const row of editRows) {
        if (row.quantity === null || row.quantity === undefined) {
          message.error('Quantity is required for all items');
          return;
        }
        if (row.discountPercent === null || row.discountPercent === undefined) {
          message.error('Discount is required for all items');
          return;
        }
        if (Number(row.quantity) < 0) {
          message.error('Quantity cannot be negative');
          return;
        }
        const discountValue = Number(row.discountPercent);
        if (discountValue < 0 || discountValue > 100) {
          message.error('Discount must be between 0 and 100');
          return;
        }
      }
      const res = await updateInvoice(editingInvoice.id, {
        items: editRows.map((row) => ({
          name: row.name,
          description: row.description,
          unit: row.unit,
          quantity: row.quantity,
          unitPriceNet: row.unitPriceNet,
          vatRate: row.vatRate,
          discountPercent: row.discountPercent ?? 0,
        })),
      });
      message.success('Invoice updated');
      setEditModalOpen(false);
      setEditingInvoice(undefined);
      setSelected(res.data);
      actionRef.current?.reload();
    } catch (err: any) {
      const backendMsg = err?.data?.message || err?.response?.data?.message;
      message.error(backendMsg || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchPriceOptions = async (q?: string) => {
    try {
      setPriceLoading(true);
      const res = await listPriceItemsPaged({
        q: q && q.length > 0 ? q : '%',
        onlyActive: true,
        page: 0,
        size: 20,
        sort: 'name,asc',
      });
      setPriceOptions(res.data?.content || []);
    } catch {
      setPriceOptions([]);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!addPriceId) {
      message.error('Select a price list item');
      return;
    }
    const selectedItem = priceOptions.find((opt) => opt.id === addPriceId);
    if (!selectedItem) {
      message.error('Selected item not found');
      return;
    }
    setEditRows((prev) => {
      const matchIndex = prev.findIndex(
        (row) =>
          row.name === selectedItem.name &&
          row.unit === selectedItem.unit &&
          Number(row.unitPriceNet || 0) ===
            Number(selectedItem.priceNet || 0) &&
          Number(row.vatRate || 0) === Number(selectedItem.vatRate || 0),
      );
      if (matchIndex >= 0) {
        const updated = [...prev];
        const current = updated[matchIndex];
        updated[matchIndex] = {
          ...current,
          quantity: Number(current.quantity || 0) + Number(addQty || 1),
        };
        message.success('Quantity updated');
        return updated;
      }
      return [
        ...prev,
        {
          name: selectedItem.name,
          description: selectedItem.description,
          unit: selectedItem.unit,
          quantity: addQty ?? 1,
          unitPriceNet: selectedItem.priceNet ?? 0,
          vatRate: selectedItem.vatRate ?? 0,
          discountPercent: addDiscount ?? 0,
        },
      ];
    });
    setAddPriceId(undefined);
    setAddQty(1);
    setAddDiscount(0);
  };

  const calcPreview = (item: any) => {
    const qty = Number(item?.quantity || 0);
    const price = Number(item?.unitPriceNet || 0);
    const vatRate = Number(item?.vatRate || 0);
    const discount = Number(item?.discountPercent || 0);
    const safeDiscount = Math.min(Math.max(discount, 0), 100);
    const net = qty * price * (1 - safeDiscount / 100);
    const vat = net * vatRate;
    const gross = net + vat;
    return { net, vat, gross };
  };

  const buildTimelineSteps = (invoice?: InvoiceResponseDTO) => {
    if (!invoice) return [];
    const steps: Array<{
      key: InvoiceStatus;
      label: string;
      time?: string;
    }> = [
      { key: 'ISSUED', label: 'Issued', time: invoice.issuedAt },
      { key: 'SENT', label: 'Sent', time: invoice.sentAt },
      { key: 'PAID', label: 'Paid', time: invoice.paidAt },
      { key: 'RETURNED', label: 'Returned', time: invoice.returnedAt },
      { key: 'OVERDUE', label: 'Overdue', time: invoice.overdueAt },
    ];

    return steps.map((step) => {
      const isCurrent = invoice.status === step.key;
      const hasTime = Boolean(step.time);
      const isErrorStep = step.key === 'RETURNED' || step.key === 'OVERDUE';
      let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';
      if (isCurrent) {
        status = isErrorStep ? 'error' : 'process';
      } else if (hasTime) {
        status = isErrorStep ? 'error' : 'finish';
      }
      return {
        title: step.label,
        description: step.time ? formatDateTime(step.time) : '—',
        status,
      };
    });
  };

  const renderActionButton = (
    label: string,
    onClick: () => void,
    enabled: boolean,
    tooltip: string,
    type: 'primary' | 'default' = 'default',
  ) => (
    <Tooltip title={!enabled ? tooltip : ''}>
      <span>
        <Button
          type={type}
          block
          disabled={!enabled}
          onClick={enabled ? onClick : undefined}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );

  const renderIconActionButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    enabled: boolean,
    tooltip: string,
    opts?: { type?: 'primary' | 'default'; danger?: boolean },
  ) => (
    <Tooltip title={enabled ? label : tooltip}>
      <span>
        <Button
          type={opts?.type || 'default'}
          shape="circle"
          icon={icon}
          danger={opts?.danger}
          disabled={!enabled}
          onClick={enabled ? onClick : undefined}
        />
      </span>
    </Tooltip>
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status')?.toUpperCase();
    const validStatuses: InvoiceStatus[] = [
      'ISSUED',
      'SENT',
      'PAID',
      'RETURNED',
      'OVERDUE',
    ];
    const status = validStatuses.includes(statusParam as InvoiceStatus)
      ? (statusParam as InvoiceStatus)
      : undefined;
    formRef.current?.setFieldsValue({
      status,
    });
    if (status) {
      formRef.current?.submit?.();
    }
  }, [location.search]);

  useEffect(() => {
    const loadCustomer = async () => {
      if (!selected?.customerId) {
        setCustomerDetails(null);
        return;
      }
      try {
        setCustomerLoading(true);
        const res = await getCustomer(selected.customerId);
        setCustomerDetails(res.data || null);
      } catch {
        setCustomerDetails(null);
      } finally {
        setCustomerLoading(false);
      }
    };
    loadCustomer();
  }, [selected?.customerId]);

  const editColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (val: any) => <span>{val}</span>,
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      width: 120,
      render: (val: any) => <span>{val}</span>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 90,
      render: (_: any, __: any, index: number) => (
        <InputNumber
          min={1}
          step={1}
          precision={0}
          style={{ width: '100%' }}
          value={editRows[index]?.quantity}
          onChange={(val) => {
            setEditRows((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], quantity: Number(val) };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: 'Unit Net',
      dataIndex: 'unitPriceNet',
      width: 120,
      render: (val: any) => money.format(val || 0),
    },
    {
      title: 'VAT',
      dataIndex: 'vatRate',
      width: 90,
      render: (val: any) => `${(val ?? 0) * 100}%`,
    },
    {
      title: 'Discount %',
      dataIndex: 'discountPercent',
      width: 120,
      render: (_: any, __: any, index: number) => (
        <InputNumber
          min={0}
          max={100}
          style={{ width: '100%' }}
          value={editRows[index]?.discountPercent ?? 0}
          onChange={(val) => {
            setEditRows((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], discountPercent: Number(val) };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: 'Net',
      dataIndex: 'net',
      width: 120,
      render: (_: any, __: any, index: number) =>
        money.format(calcPreview(editRows[index]).net || 0),
    },
    {
      title: 'Gross',
      dataIndex: 'gross',
      width: 120,
      render: (_: any, __: any, index: number) =>
        money.format(calcPreview(editRows[index]).gross || 0),
    },
    {
      title: 'Actions',
      width: 90,
      render: (_: any, __: any, index: number) => (
        <Button
          type="link"
          danger
          onClick={() =>
            setEditRows((prev) => prev.filter((_, i) => i !== index))
          }
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<InvoiceResponseDTO>
        rowKey="id"
        actionRef={actionRef}
        formRef={formRef}
        columns={columns}
        search={{
          labelWidth: 90,
          span: 6,
        }}
        request={async (params) => {
          try {
            const res = await listInvoicesPaged({
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
            message.error(err?.data?.message || 'Failed to load invoices');
            return { data: [], success: false };
          }
        }}
        toolbar={{
          title: 'Invoices',
          actions: [
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setFormOpen(true);
              }}
            >
              New from Order
            </Button>,
          ],
        }}
      />

      <CreateInvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onFinish={async (values) => {
          try {
            await createFromOrder(values.orderId);
            message.success('Invoice created');
            setFormOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Create failed');
            return false;
          }
        }}
      />

      <Drawer
        width={960}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(undefined);
        }}
        title={`Invoice ${selected?.invoiceNumber || selected?.id || ''}`}
      >
        {selected && (
          <>
            <Typography.Title level={5} style={{ marginBottom: 12 }}>
              Status Timeline
            </Typography.Title>
            <Steps
              size="small"
              labelPlacement="vertical"
              items={buildTimelineSteps(selected)}
            />

            <Divider />

            <Row gutter={16}>
              <Col xs={24} md={16}>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Customer">
                    {selected.customerName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Badge
                      status={statusColors[selected.status]}
                      text={selected.status}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Currency">
                    {selected.currency}
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date">
                    {formatDate(selected.dueDate)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Net">
                    {money.format(selected.totalNet || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Gross">
                    {money.format(selected.totalGross || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Issued At">
                    {formatDateTime(selected.issuedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sent At">
                    {formatDateTime(selected.sentAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Paid At">
                    {formatDateTime(selected.paidAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Returned At">
                    {formatDateTime(selected.returnedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Overdue At">
                    {formatDateTime(selected.overdueAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Overdue" span={2}>
                    {selected.overdue ? (
                      <Tag color="error">
                        Overdue {selected.daysOverdue} days
                      </Tag>
                    ) : (
                      <Tag color="success">No</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>

                <Divider />
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                  Items
                </Typography.Title>
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(_, idx) => idx as number}
                  dataSource={selected.items || []}
                  columns={[
                    {
                      title: 'Name',
                      dataIndex: 'name',
                      render: (val) => (
                        <Typography.Text strong>{val}</Typography.Text>
                      ),
                    },
                    {
                      title: 'Unit',
                      dataIndex: 'unit',
                      width: 80,
                      render: (val) => val || '—',
                    },
                    {
                      title: 'Qty',
                      dataIndex: 'quantity',
                      width: 80,
                    },
                    {
                      title: 'Unit Net',
                      dataIndex: 'unitPriceNet',
                      width: 120,
                      render: (val) => money.format(val || 0),
                    },
                    {
                      title: 'VAT',
                      dataIndex: 'vatRate',
                      width: 80,
                      render: (val) => formatPercent(val),
                    },
                    {
                      title: 'Discount %',
                      dataIndex: 'discountPercent',
                      width: 120,
                      render: (val) => `${val ?? 0}%`,
                    },
                    {
                      title: 'Net',
                      dataIndex: 'lineNet',
                      width: 120,
                      render: (val) => money.format(val || 0),
                    },
                    {
                      title: 'Gross',
                      dataIndex: 'lineGross',
                      width: 120,
                      render: (val) => money.format(val || 0),
                    },
                  ]}
                  scroll={{ x: true }}
                />
                <div style={{ marginTop: 8 }}>
                  <Button type="link" onClick={() => openPdf(selected.id)}>
                    Download PDF
                  </Button>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <Card title="Quick Actions" size="small">
                    <Space
                      direction="vertical"
                      style={{ width: '100%' }}
                      size="small"
                    >
                      <Space size={8} wrap>
                        {renderIconActionButton(
                          'Mark Sent',
                          <SendOutlined />,
                          () => handleStatusChange(selected.id, 'SENT'),
                          selected.status === 'ISSUED' ||
                            selected.status === 'RETURNED',
                          'Only ISSUED/RETURNED invoices can be sent',
                          { type: 'primary' },
                        )}
                        <Popconfirm
                          title="Mark invoice as paid?"
                          description="This action is final."
                          onConfirm={() =>
                            handleStatusChange(selected.id, 'PAID')
                          }
                          okText="Mark Paid"
                          cancelText="Cancel"
                        >
                          {renderIconActionButton(
                            'Mark Paid',
                            <CheckCircleOutlined />,
                            () => {},
                            ['ISSUED', 'SENT', 'OVERDUE'].includes(
                              selected.status,
                            ),
                            'Only ISSUED/SENT/OVERDUE invoices can be paid',
                          )}
                        </Popconfirm>
                        {renderIconActionButton(
                          'Return',
                          <RollbackOutlined />,
                          () => handleStatusChange(selected.id, 'RETURNED'),
                          ['ISSUED', 'SENT'].includes(selected.status),
                          'Only ISSUED/SENT invoices can be returned',
                          { danger: true },
                        )}
                        <Popconfirm
                          title="Mark invoice as overdue?"
                          description="This action is final."
                          onConfirm={() =>
                            handleStatusChange(selected.id, 'OVERDUE')
                          }
                          okText="Mark Overdue"
                          cancelText="Cancel"
                        >
                          {renderIconActionButton(
                            'Mark Overdue',
                            <ExclamationCircleOutlined />,
                            () => {},
                            Boolean(selected.overdue) &&
                              ['ISSUED', 'SENT'].includes(selected.status),
                            'Only overdue ISSUED/SENT invoices can be marked overdue',
                            { danger: true },
                          )}
                        </Popconfirm>
                      </Space>
                      <Space
                        direction="vertical"
                        style={{ width: '100%' }}
                        size="small"
                      >
                        {renderActionButton(
                          'Re-issue',
                          () => handleStatusChange(selected.id, 'ISSUED'),
                          selected.status === 'RETURNED',
                          'Only RETURNED invoices can be re-issued',
                        )}
                        {renderActionButton(
                          'Edit Items',
                          () => openEditModal(selected),
                          selected.status === 'RETURNED',
                          'Only RETURNED invoices can be edited',
                        )}
                        {renderActionButton(
                          'Create Reminder',
                          () => handleCreateReminder(selected),
                          selected.status === 'OVERDUE',
                          'Only OVERDUE invoices can create reminders',
                        )}
                      </Space>
                    </Space>
                  </Card>

                  <Card title="Financial Snapshot" size="small">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Net">
                        {money.format(selected.totalNet || 0)}
                      </Descriptions.Item>
                      <Descriptions.Item label="VAT">
                        {money.format(selected.totalVat || 0)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Gross">
                        {money.format(selected.totalGross || 0)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Due Date">
                        {formatDate(selected.dueDate)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Days Overdue">
                        {selected.overdue ? selected.daysOverdue : '—'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card title="Customer" size="small" loading={customerLoading}>
                    {customerDetails ? (
                      <Space direction="vertical" size={6}>
                        <Typography.Text strong>
                          {customerDetails.name}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {customerDetails.email || 'No email'}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {customerDetails.phone || 'No phone'}
                        </Typography.Text>
                        <Typography.Text>
                          Payment Terms:{' '}
                          {customerDetails.paymentTermsDays ??
                            selected.paymentTermsDays ??
                            '—'}
                        </Typography.Text>
                        <Typography.Link
                          onClick={() =>
                            window.open(
                              `/billing/customers?customerId=${selected.customerId}`,
                              '_blank',
                            )
                          }
                        >
                          View Customer
                        </Typography.Link>
                      </Space>
                    ) : (
                      <Typography.Text type="secondary">
                        Customer details unavailable
                      </Typography.Text>
                    )}
                  </Card>

                  <Card title="Internal Flags" size="small">
                    {(() => {
                      const flags: string[] = [];
                      if (
                        selected.status === 'RETURNED' &&
                        selected.returnedAt
                      ) {
                        flags.push(
                          `Returned at ${formatDateTime(selected.returnedAt)}`,
                        );
                      }
                      if (selected.status === 'OVERDUE' || selected.overdue) {
                        flags.push(`Overdue ${selected.daysOverdue || 0} days`);
                      }
                      if (selected.reminderForInvoiceId) {
                        flags.push(
                          `Reminder for invoice #${selected.reminderForInvoiceId}`,
                        );
                      }
                      return flags.length ? (
                        <Space direction="vertical" size={6}>
                          {flags.map((flag, idx) => (
                            <Typography.Text key={idx}>{flag}</Typography.Text>
                          ))}
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">
                          No internal flags
                        </Typography.Text>
                      );
                    })()}
                  </Card>
                </Space>
              </Col>
            </Row>
          </>
        )}
      </Drawer>

      <Modal
        title={`Edit Invoice Items ${
          editingInvoice?.invoiceNumber || editingInvoice?.id || ''
        }`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingInvoice(undefined);
          setEditRows([]);
        }}
        okText="Save Changes"
        okButtonProps={{ loading: savingEdit }}
        onOk={handleEditSave}
        width={960}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space size={12} wrap>
            <Select<number>
              style={{ minWidth: 260 }}
              placeholder="Select price list item"
              showSearch
              filterOption={false}
              loading={priceLoading}
              value={addPriceId}
              onSearch={(val) => fetchPriceOptions(val)}
              onDropdownVisibleChange={(open) => {
                if (open && priceOptions.length === 0) {
                  fetchPriceOptions();
                }
              }}
              onChange={(val) => setAddPriceId(val)}
              options={priceOptions.map((opt) => ({
                label: formatPriceItemLabel(opt.name, opt.description),
                value: opt.id as number,
              }))}
            />
            <InputNumber
              min={1}
              step={1}
              precision={0}
              value={addQty}
              onChange={(val) => setAddQty(Number(val))}
              placeholder="Qty"
              addonBefore="Qty"
            />
            <InputNumber
              min={0}
              max={100}
              value={addDiscount}
              onChange={(val) => setAddDiscount(Number(val))}
              placeholder="Discount %"
              addonBefore="Discount"
            />
            <Button type="primary" onClick={handleAddItem}>
              Add Service
            </Button>
          </Space>
          <Table
            size="small"
            pagination={false}
            rowKey={(_, idx) => idx as number}
            dataSource={editRows}
            columns={editColumns as any}
            scroll={{ x: true }}
          />
        </Space>
      </Modal>

      <Modal
        title={`Create Recurring Plan from Invoice ${
          planInvoice?.invoiceNumber || planInvoice?.id || ''
        }`}
        open={planModalOpen}
        onCancel={() => setPlanModalOpen(false)}
        destroyOnClose
        okText="Create Plan"
        okButtonProps={{ loading: creatingPlan }}
        onOk={async () => {
          try {
            const values = await planForm.validateFields();
            if (!planInvoice) return;
            setCreatingPlan(true);
            const payload = {
              currency: planInvoice.currency,
              paymentTermsDays: planInvoice.paymentTermsDays,
              startDate: values.startDate?.format('YYYY-MM-DD'),
              nextRunDate: values.nextRunDate?.format('YYYY-MM-DD'),
              maxOccurrences: values.maxOccurrences,
              notes: values.notes,
              frequency: values.frequency,
            };
            const res = await createPlanFromInvoice(planInvoice.id, payload);
            message.success('Recurring plan created');
            setPlanModalOpen(false);
            if (res.data?.id) {
              window.open(
                `/billing/recurring-plans?planId=${res.data.id}`,
                '_blank',
              );
            }
          } catch (err: any) {
            const backendMsg =
              err?.data?.message || err?.response?.data?.message;
            const msg =
              backendMsg || err?.message || 'Failed to create recurring plan';
            message.error(msg);
          } finally {
            setCreatingPlan(false);
          }
        }}
      >
        {planInvoice ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Customer">
                {planInvoice.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="Currency">
                {planInvoice.currency || 'EUR'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {planInvoice.status}
              </Descriptions.Item>
              <Descriptions.Item label="Total Gross">
                {money.format(planInvoice.totalGross || 0)}
              </Descriptions.Item>
            </Descriptions>
            <Form
              form={planForm}
              layout="vertical"
              initialValues={{
                frequency: 'MONTHLY',
                maxOccurrences: 12,
              }}
            >
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                <Space style={{ display: 'flex' }} size={12}>
                  <Form.Item
                    name="maxOccurrences"
                    label="Max Occurrences"
                    rules={[
                      { required: true, message: 'Enter max occurrences' },
                    ]}
                    style={{ flex: 1 }}
                  >
                    <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="frequency"
                    label="Frequency"
                    style={{ flex: 1 }}
                  >
                    <Select
                      options={[
                        { label: 'Monthly', value: 'MONTHLY' },
                        { label: 'Weekly', value: 'WEEKLY' },
                        { label: 'Daily', value: 'DAILY' },
                        { label: 'Yearly', value: 'YEARLY' },
                      ]}
                    />
                  </Form.Item>
                </Space>
                <Space style={{ display: 'flex' }} size={12}>
                  <Form.Item
                    name="startDate"
                    label="Start Date"
                    rules={[{ required: true, message: 'Select start date' }]}
                    style={{ flex: 1 }}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="nextRunDate"
                    label="Next Run Date"
                    style={{ flex: 1 }}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Space>
                <Form.Item name="notes" label="Notes">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Space>
            </Form>
            <Typography.Title level={5} style={{ marginBottom: 8 }}>
              Items (read-only)
            </Typography.Title>
            <Table
              size="small"
              pagination={false}
              rowKey={(_, idx) => idx as number}
              dataSource={planInvoice.items || []}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                { title: 'Unit', dataIndex: 'unit', width: 80 },
                { title: 'Qty', dataIndex: 'quantity', width: 80 },
                {
                  title: 'Net',
                  dataIndex: 'lineNet',
                  render: (val) => money.format(val || 0),
                  width: 100,
                },
                {
                  title: 'VAT',
                  dataIndex: 'vatRate',
                  render: (val) => `${(val ?? 0) * 100}%`,
                  width: 80,
                },
                {
                  title: 'Gross',
                  dataIndex: 'lineGross',
                  render: (val) => money.format(val || 0),
                  width: 100,
                },
              ]}
            />
          </Space>
        ) : (
          <div>Loading invoice...</div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default InvoicesPage;
