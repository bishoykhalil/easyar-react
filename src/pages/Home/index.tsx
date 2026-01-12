import {
  listInvoicesPaged,
  type InvoiceResponseDTO,
} from '@/services/invoices';
import { listPlans, type RecurringPlanDTO } from '@/services/recurring';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  List,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const HomePage: React.FC = () => {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });

  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [plans, setPlans] = useState<RecurringPlanDTO[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingInvoices(true);
      setLoadingPlans(true);
      try {
        const res = await listInvoicesPaged({
          q: '%',
          page: 0,
          size: 200,
          sort: 'createdAt,desc',
        });
        setInvoices(res.data?.content || []);
      } catch {
        setInvoices([]);
      } finally {
        setLoadingInvoices(false);
      }
      try {
        const res = await listPlans();
        setPlans(res.data || []);
      } catch {
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    load();
  }, []);

  const parseDate = (value?: string) => (value ? new Date(value) : null);

  const kpis = useMemo(() => {
    const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];
    const open = invoices.filter((inv) => openStatuses.includes(inv.status));
    const overdue = invoices.filter(
      (inv) => inv.overdue || inv.status === 'OVERDUE',
    );
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoon = open.filter((inv) => {
      const due = parseDate(inv.dueDate);
      return due && due >= now && due <= in7Days;
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const recurringThisMonth = invoices.filter((inv) => {
      if (!inv.recurring) return false;
      const date = parseDate(inv.issuedAt || inv.createdAt);
      return date ? date >= startOfMonth && date <= endOfMonth : false;
    });
    const recurringTotal = recurringThisMonth.reduce(
      (sum, inv) => sum + (inv.totalGross || 0),
      0,
    );

    const activePlans = plans.filter((p) => p.status === 'ACTIVE' || p.active);
    const pausedPlans = plans.filter(
      (p) =>
        p.status === 'PAUSED' || (p.active === false && p.status !== 'EXPIRED'),
    );
    const expiringPlans = plans.filter((p) => {
      const remaining =
        p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount;
      return remaining <= 1 && remaining >= 0;
    });

    return [
      {
        title: 'Open invoices',
        value: String(open.length),
        note: `${dueSoon.length} due this week`,
      },
      {
        title: 'Overdue amount',
        value: money.format(
          overdue.reduce((sum, inv) => sum + (inv.totalGross || 0), 0),
        ),
        note: `${overdue.length} invoices overdue`,
      },
      {
        title: 'Recurring revenue',
        value: money.format(recurringTotal),
        note: 'This month',
      },
      {
        title: 'Active plans',
        value: String(activePlans.length),
        note: `${pausedPlans.length} paused, ${expiringPlans.length} expiring`,
      },
    ];
  }, [invoices, plans, money]);

  const upcomingRuns = useMemo(() => {
    const activePlans = plans.filter((p) => p.status === 'ACTIVE' || p.active);
    const sorted = [...activePlans].sort((a, b) => {
      const aDate = parseDate(a.nextRunDate)?.getTime() || 0;
      const bDate = parseDate(b.nextRunDate)?.getTime() || 0;
      return aDate - bDate;
    });
    const calcAmount = (plan: RecurringPlanDTO) => {
      return plan.items.reduce((sum, item) => {
        const qty = item.quantity || 0;
        const unit = item.unitPriceNet || 0;
        const discount = item.discountPercent || 0;
        const net = qty * unit * (1 - discount / 100);
        const vat = net * (item.vatRate || 0);
        return sum + net + vat;
      }, 0);
    };
    return sorted.slice(0, 5).map((plan) => ({
      key: plan.id,
      plan: `Plan #${plan.id}`,
      customer: plan.customerName,
      nextRun: plan.nextRunDate,
      amount: money.format(calcAmount(plan)),
      status: plan.status || (plan.active ? 'ACTIVE' : 'PAUSED'),
    }));
  }, [plans, money]);

  const openInvoices = useMemo(() => {
    const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];
    const open = invoices.filter((inv) => openStatuses.includes(inv.status));
    const sorted = [...open].sort((a, b) => {
      const aDate = parseDate(a.dueDate)?.getTime() || 0;
      const bDate = parseDate(b.dueDate)?.getTime() || 0;
      return aDate - bDate;
    });
    return sorted.slice(0, 5).map((inv) => ({
      key: inv.id,
      invoice: inv.invoiceNumber || `#${inv.id}`,
      customer: inv.customerName,
      status: inv.status,
      dueDate: inv.dueDate || '-',
      amount: money.format(inv.totalGross || 0),
    }));
  }, [invoices, money]);

  const alerts = useMemo(() => {
    const items: {
      key: number;
      title: string;
      detail: string;
      tone: string;
    }[] = [];
    const overdue = invoices.filter(
      (inv) => inv.overdue || inv.status === 'OVERDUE',
    );
    if (overdue.length) {
      items.push({
        key: 1,
        title: 'Overdue invoices',
        detail: `${overdue.length} invoices need attention`,
        tone: 'error',
      });
    }
    const paused = plans.filter(
      (p) =>
        p.status === 'PAUSED' || (p.active === false && p.status !== 'EXPIRED'),
    );
    if (paused.length) {
      items.push({
        key: 2,
        title: 'Plans paused',
        detail: `${paused.length} recurring plans are paused`,
        tone: 'warning',
      });
    }
    const expiring = plans.filter((p) => {
      const remaining =
        p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount;
      return remaining <= 1 && remaining >= 0;
    });
    if (expiring.length) {
      items.push({
        key: 3,
        title: 'Plans expiring soon',
        detail: `${expiring.length} plan(s) have 1 run left`,
        tone: 'info',
      });
    }
    return items.slice(0, 3);
  }, [invoices, plans]);

  return (
    <PageContainer>
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          {kpis.map((kpi) => (
            <Col xs={24} sm={12} lg={6} key={kpi.title}>
              <Card className={styles.card} bordered>
                <Space direction="vertical" size={2}>
                  <Typography.Text className={styles.kpiLabel}>
                    {kpi.title}
                  </Typography.Text>
                  <Typography.Title level={3} className={styles.kpiValue}>
                    {kpi.value}
                  </Typography.Title>
                  <Typography.Text type="secondary">{kpi.note}</Typography.Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              className={styles.card}
              title="Upcoming recurring runs"
              extra={
                <Button
                  size="small"
                  onClick={() => history.push('/billing/recurring-plans')}
                >
                  View plans
                </Button>
              }
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                dataSource={upcomingRuns}
                loading={loadingPlans}
                columns={[
                  { title: 'Plan', dataIndex: 'plan' },
                  { title: 'Customer', dataIndex: 'customer' },
                  { title: 'Next run', dataIndex: 'nextRun' },
                  { title: 'Amount', dataIndex: 'amount', align: 'right' },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    render: (val: string) => (
                      <Tag color={val === 'ACTIVE' ? 'green' : 'default'}>
                        {val}
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              className={styles.card}
              title="Open invoices"
              extra={
                <Button
                  size="small"
                  onClick={() => history.push('/billing/invoices')}
                >
                  View invoices
                </Button>
              }
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                dataSource={openInvoices}
                loading={loadingInvoices}
                columns={[
                  { title: 'Invoice', dataIndex: 'invoice' },
                  { title: 'Customer', dataIndex: 'customer' },
                  { title: 'Due', dataIndex: 'dueDate' },
                  { title: 'Amount', dataIndex: 'amount', align: 'right' },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    render: (val: string) => (
                      <Tag
                        color={
                          val === 'OVERDUE'
                            ? 'red'
                            : val === 'SENT'
                            ? 'blue'
                            : 'gold'
                        }
                      >
                        {val}
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card className={styles.card} title="Alerts and exceptions">
              {alerts.length ? (
                <List
                  dataSource={alerts}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={2}>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Typography.Text type="secondary">
                          {item.detail}
                        </Typography.Text>
                      </Space>
                      <Tag
                        color={
                          item.tone === 'error'
                            ? 'red'
                            : item.tone === 'warning'
                            ? 'orange'
                            : 'blue'
                        }
                      >
                        {item.tone.toUpperCase()}
                      </Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <Typography.Text type="secondary">
                  No alerts right now
                </Typography.Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default HomePage;
