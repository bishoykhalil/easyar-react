import {
  createFromOrder,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  listInvoicesPaged,
  updateInvoiceStatus,
  type InvoiceResponseDTO,
  type InvoiceStatus,
} from '@/services/invoices';
import { createPlanFromInvoice } from '@/services/recurring';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Card,
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
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CreateInvoiceForm from './components/CreateInvoiceForm';

const statusColors: Record<
  InvoiceStatus,
  'default' | 'processing' | 'success' | 'error'
> = {
  DRAFT: 'default',
  ISSUED: 'processing',
  PAID: 'success',
  CANCELLED: 'error',
};

const money = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'EUR',
});
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

  const openPlanModal = async (record: InvoiceResponseDTO) => {
    try {
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
        DRAFT: { text: 'DRAFT' },
        ISSUED: { text: 'ISSUED' },
        PAID: { text: 'PAID' },
        CANCELLED: { text: 'CANCELLED' },
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
          {record.status === 'DRAFT' && (
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

  return (
    <PageContainer>
      <ProTable<InvoiceResponseDTO>
        rowKey="id"
        actionRef={actionRef}
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
        width={720}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(undefined);
        }}
        title={`Invoice ${selected?.invoiceNumber || selected?.id || ''}`}
      >
        {selected && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Customer">
                {selected.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Space>
                  <Badge
                    status={statusColors[selected.status]}
                    text={selected.status}
                  />
                  {selected.status === 'DRAFT' && (
                    <Space size={4}>
                      <a
                        onClick={() =>
                          handleStatusChange(selected.id, 'ISSUED')
                        }
                      >
                        Issue
                      </a>
                      <a
                        onClick={() =>
                          handleStatusChange(selected.id, 'CANCELLED')
                        }
                      >
                        Cancel
                      </a>
                    </Space>
                  )}
                  {selected.status === 'ISSUED' && (
                    <Space size={4}>
                      <a
                        onClick={() => handleStatusChange(selected.id, 'PAID')}
                      >
                        Mark Paid
                      </a>
                    </Space>
                  )}
                </Space>
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
              <Descriptions.Item label="Paid At">
                {formatDateTime(selected.paidAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Overdue" span={2}>
                {selected.overdue ? (
                  <Tag color="error">Overdue {selected.daysOverdue} days</Tag>
                ) : (
                  <Tag color="success">No</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            <Typography.Title level={5} style={{ marginBottom: 12 }}>
              Items
            </Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {selected.items?.map((item, idx) => (
                <Card key={idx} size="small" bodyStyle={{ padding: 12 }}>
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size={4}
                  >
                    <Space align="baseline">
                      <Typography.Text strong>{item.name}</Typography.Text>
                      {item.unit && <Tag>{item.unit}</Tag>}
                    </Space>
                    {item.description && (
                      <Typography.Text type="secondary">
                        {item.description}
                      </Typography.Text>
                    )}
                    <Space wrap size={12}>
                      <span>Qty: {item.quantity}</span>
                      <span>Unit: {money.format(item.unitPriceNet || 0)}</span>
                      <span>VAT: {(item.vatRate ?? 0) * 100}%</span>
                      <span>Net: {money.format(item.lineNet || 0)}</span>
                      <span>Gross: {money.format(item.lineGross || 0)}</span>
                    </Space>
                  </Space>
                </Card>
              ))}
            </Space>
            <Divider />
            <Button type="link" onClick={() => openPdf(selected.id)}>
              Download PDF
            </Button>
          </>
        )}
      </Drawer>

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
