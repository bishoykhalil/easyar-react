import {
  listInvoicesPaged,
  type InvoiceResponseDTO,
} from '@/services/invoices';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Progress, Row, Space, Table, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles.less';

const FinanceDashboard: React.FC = () => {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });
  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await listInvoicesPaged({
          q: '%',
          page: 0,
          size: 500,
          sort: 'createdAt,desc',
        });
        setInvoices(res.data?.content || []);
      } catch {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const parseDate = (value?: string) => (value ? new Date(value) : null);

  const summary = useMemo(() => {
    const paid = invoices.filter((inv) => inv.status === 'PAID');
    const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];
    const open = invoices.filter((inv) => openStatuses.includes(inv.status));
    const overdue = invoices.filter(
      (inv) => inv.overdue || inv.status === 'OVERDUE',
    );
    const reminderInvoices = invoices.filter((inv) => inv.reminderForInvoiceId);
    return {
      total: invoices.reduce((sum, inv) => sum + (inv.totalGross || 0), 0),
      paid: paid.reduce((sum, inv) => sum + (inv.totalGross || 0), 0),
      open: open.reduce((sum, inv) => sum + (inv.totalGross || 0), 0),
      overdue: overdue.reduce((sum, inv) => sum + (inv.totalGross || 0), 0),
      lateFees: reminderInvoices.reduce(
        (sum, inv) => sum + (inv.totalGross || 0),
        0,
      ),
    };
  }, [invoices]);

  const monthRows = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: date.toLocaleString('en', { month: 'short', year: 'numeric' }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      };
    });
    return months.map((month) => {
      let net = 0;
      let gross = 0;
      let paid = 0;
      let open = 0;
      invoices.forEach((inv) => {
        const date = parseDate(inv.issuedAt || inv.createdAt);
        if (!date || date < month.start || date >= month.end) return;
        net += inv.totalNet || 0;
        gross += inv.totalGross || 0;
        if (inv.status === 'PAID') {
          paid += inv.totalGross || 0;
        } else {
          open += inv.totalGross || 0;
        }
      });
      return {
        key: month.key,
        month: month.label,
        net,
        gross,
        paid,
        outstanding: open,
      };
    });
  }, [invoices]);

  const agingBuckets = useMemo(() => {
    const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];
    const buckets = [
      { label: '0-30', min: 1, max: 30, count: 0, amount: 0 },
      { label: '31-60', min: 31, max: 60, count: 0, amount: 0 },
      { label: '61-90', min: 61, max: 90, count: 0, amount: 0 },
      { label: '90+', min: 91, max: Infinity, count: 0, amount: 0 },
    ];
    const now = new Date();
    invoices
      .filter((inv) => openStatuses.includes(inv.status))
      .forEach((inv) => {
        const due = parseDate(inv.dueDate);
        if (!due) return;
        const days = Math.floor(
          (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (days <= 0) return;
        const bucket = buckets.find((b) => days >= b.min && days <= b.max);
        if (bucket) {
          bucket.count += 1;
          bucket.amount += inv.totalGross || 0;
        }
      });
    return buckets;
  }, [invoices]);

  return (
    <PageContainer title="Finance Overview">
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          {[
            { title: 'Total revenue', value: summary.total },
            { title: 'Paid', value: summary.paid },
            { title: 'Outstanding', value: summary.open },
            { title: 'Overdue', value: summary.overdue },
            { title: 'Late fees', value: summary.lateFees },
          ].map((kpi) => (
            <Col xs={24} sm={12} lg={4} key={kpi.title}>
              <Card className={styles.card} bordered>
                <Space direction="vertical" size={2}>
                  <Typography.Text className={styles.kpiLabel}>
                    {kpi.title}
                  </Typography.Text>
                  <Typography.Title level={4} className={styles.kpiValue}>
                    {money.format(kpi.value)}
                  </Typography.Title>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card className={styles.card} title="Revenue by month">
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                loading={loading}
                dataSource={monthRows}
                columns={[
                  { title: 'Month', dataIndex: 'month' },
                  {
                    title: 'Net',
                    dataIndex: 'net',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: 'Gross',
                    dataIndex: 'gross',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: 'Paid',
                    dataIndex: 'paid',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: 'Outstanding',
                    dataIndex: 'outstanding',
                    align: 'right',
                    render: (val: number, record: any) => (
                      <Space direction="vertical" size={2}>
                        <Typography.Text>{money.format(val)}</Typography.Text>
                        <Progress
                          percent={
                            record.gross
                              ? Math.min(100, (val / record.gross) * 100)
                              : 0
                          }
                          showInfo={false}
                          size="small"
                        />
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card className={styles.card} title="AR aging">
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                loading={loading}
                dataSource={agingBuckets.map((b) => ({
                  key: b.label,
                  bucket: b.label,
                  count: b.count,
                  amount: money.format(b.amount),
                }))}
                columns={[
                  { title: 'Bucket', dataIndex: 'bucket' },
                  { title: 'Count', dataIndex: 'count', align: 'center' },
                  { title: 'Amount', dataIndex: 'amount', align: 'right' },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default FinanceDashboard;
