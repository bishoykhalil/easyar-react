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
  Timeline,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const HomePage: React.FC = () => {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });
  const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];

  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [plans, setPlans] = useState<RecurringPlanDTO[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [activeTrendIndex, setActiveTrendIndex] = useState<number | null>(null);

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

  const parseDate = (value?: string) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(value);
  };

  const kpis = useMemo(() => {
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

  const revenueTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const label = date.toLocaleString('en', { month: 'short' });
      return {
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label,
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      };
    });
    return months.map((month) => {
      let net = 0;
      let gross = 0;
      invoices.forEach((inv) => {
        const date = parseDate(inv.issuedAt || inv.createdAt);
        if (!date || date < month.start || date >= month.end) return;
        net += inv.totalNet || 0;
        gross += inv.totalGross || 0;
      });
      return { label: month.label, net, gross };
    });
  }, [invoices]);

  const revenueMax = useMemo(() => {
    const values = revenueTrend.flatMap((d) => [d.net, d.gross]);
    return Math.max(1, ...values);
  }, [revenueTrend]);

  const chartPoints = useMemo(() => {
    const paddingX = 2;
    const paddingY = 6;
    const width = 100 - paddingX * 2;
    const height = 40 - paddingY * 2;
    const count = revenueTrend.length > 1 ? revenueTrend.length - 1 : 1;
    return revenueTrend.map((point, index) => {
      const x = paddingX + (index / count) * width;
      const netRatio = point.net / revenueMax;
      const grossRatio = point.gross / revenueMax;
      const yNet = 40 - paddingY - netRatio * height;
      const yGross = 40 - paddingY - grossRatio * height;
      return { ...point, x, yNet, yGross };
    });
  }, [revenueTrend, revenueMax]);

  const chartNetLine = useMemo(
    () => chartPoints.map((p) => `${p.x},${p.yNet}`).join(' '),
    [chartPoints],
  );

  const chartGrossLine = useMemo(
    () => chartPoints.map((p) => `${p.x},${p.yGross}`).join(' '),
    [chartPoints],
  );

  const chartGrossArea = useMemo(() => {
    if (!chartPoints.length) return '';
    const paddingY = 6;
    const baseY = 40 - paddingY;
    return [
      `M ${chartPoints[0].x},${baseY}`,
      ...chartPoints.map((p) => `L ${p.x},${p.yGross}`),
      `L ${chartPoints[chartPoints.length - 1].x},${baseY}`,
      'Z',
    ].join(' ');
  }, [chartPoints]);

  const activePoint =
    activeTrendIndex !== null ? chartPoints[activeTrendIndex] : null;
  const tooltipLeft = activePoint
    ? Math.min(90, Math.max(10, activePoint.x))
    : 0;

  const cashflow = useMemo(() => {
    const open = invoices.filter((inv) => openStatuses.includes(inv.status));
    const buckets = [
      { label: '0-30', min: 1, max: 30, count: 0, amount: 0 },
      { label: '31-60', min: 31, max: 60, count: 0, amount: 0 },
      { label: '61-90', min: 61, max: 90, count: 0, amount: 0 },
      { label: '90+', min: 91, max: Infinity, count: 0, amount: 0 },
    ];
    let totalOverdue = 0;
    const now = new Date();
    open.forEach((inv) => {
      const due = parseDate(inv.dueDate);
      if (!due) return;
      const days = Math.floor(
        (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days <= 0) return;
      totalOverdue += inv.totalGross || 0;
      const bucket = buckets.find((b) => days >= b.min && days <= b.max);
      if (bucket) {
        bucket.count += 1;
        bucket.amount += inv.totalGross || 0;
      }
    });
    return { buckets, totalOverdue };
  }, [invoices, openStatuses]);

  const invoiceFunnel = useMemo(() => {
    const statuses = ['ISSUED', 'SENT', 'PAID', 'RETURNED', 'OVERDUE'];
    return statuses.map((status) => ({
      status,
      count: invoices.filter((inv) => inv.status === status).length,
    }));
  }, [invoices]);

  const invoiceFunnelTotal = useMemo(
    () => invoiceFunnel.reduce((sum, item) => sum + item.count, 0),
    [invoiceFunnel],
  );

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(today.getDate() + 30);
    horizon.setHours(23, 59, 59, 999);
    return sorted
      .filter((plan) => {
        const next = parseDate(plan.nextRunDate);
        return next && next >= today && next <= horizon;
      })
      .map((plan) => ({
        key: plan.id,
        plan: `Plan #${plan.id}`,
        customer: plan.customerName,
        nextRun: plan.nextRunDate,
        amount: money.format(calcAmount(plan)),
        status: plan.status || (plan.active ? 'ACTIVE' : 'PAUSED'),
      }))
      .slice(0, 8);
  }, [plans, money]);

  const openInvoices = useMemo(() => {
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

  const topCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        revenue: number;
        overdueCount: number;
        overdueAmount: number;
        open: number;
      }
    >();
    invoices.forEach((inv) => {
      const key = inv.customerName || 'Unknown';
      const entry = map.get(key) || {
        revenue: 0,
        overdueCount: 0,
        overdueAmount: 0,
        open: 0,
      };
      entry.revenue += inv.totalGross || 0;
      if (openStatuses.includes(inv.status)) {
        entry.open += 1;
      }
      if (inv.overdue || inv.status === 'OVERDUE') {
        entry.overdueCount += 1;
        entry.overdueAmount += inv.totalGross || 0;
      }
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([customer, stats]) => {
        const risk =
          stats.overdueCount === 0
            ? 'Low'
            : stats.overdueCount === 1
            ? 'Medium'
            : 'High';
        return {
          key: customer,
          customer,
          revenue: stats.revenue,
          open: stats.open,
          overdueCount: stats.overdueCount,
          overdueAmount: stats.overdueAmount,
          risk,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoices, openStatuses]);

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
    const missingTerms = invoices.filter(
      (inv) =>
        inv.paymentTermsDays === null || inv.paymentTermsDays === undefined,
    );
    if (missingTerms.length) {
      items.push({
        key: 4,
        title: 'Missing payment terms',
        detail: `${missingTerms.length} invoice(s) without payment terms`,
        tone: 'warning',
      });
    }
    const plansWithoutItems = plans.filter(
      (p) => !p.items || p.items.length === 0,
    );
    if (plansWithoutItems.length) {
      items.push({
        key: 5,
        title: 'Plans without items',
        detail: `${plansWithoutItems.length} plan(s) have no items`,
        tone: 'error',
      });
    }
    const notSent = invoices.filter(
      (inv) => inv.status === 'ISSUED' && !inv.sentAt,
    );
    if (notSent.length) {
      items.push({
        key: 6,
        title: 'Invoices not sent',
        detail: `${notSent.length} issued invoice(s) without email sent`,
        tone: 'info',
      });
    }
    return items;
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

        <Row gutter={[16, 16]} className={styles.topRow}>
          <Col xs={24} lg={16}>
            <Card
              className={`${styles.card} ${styles.stretchCard}`}
              title="Revenue trend"
            >
              <div className={styles.chartWrapper}>
                <div className={styles.chartContainer}>
                  <svg
                    className={styles.chart}
                    viewBox="0 0 170 40"
                    preserveAspectRatio="none"
                    onMouseLeave={() => setActiveTrendIndex(null)}
                  >
                    <defs>
                      <linearGradient
                        id="grossFill"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22c55e"
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor="#22c55e"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    {[8, 16, 24, 32].map((y) => (
                      <line
                        key={y}
                        x1="2"
                        y1={y}
                        x2="98"
                        y2={y}
                        className={styles.chartGrid}
                      />
                    ))}
                    {chartGrossArea && (
                      <path d={chartGrossArea} fill="url(#grossFill)" />
                    )}
                    <polyline
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth=".3"
                      points={chartGrossLine}
                    />
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth=".3"
                      points={chartNetLine}
                    />
                    {chartPoints.map((point, index) => (
                      <g key={`${point.label}-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.yNet}
                          r={activeTrendIndex === index ? 1.3 : 0.9}
                          className={styles.chartDotNet}
                          onMouseEnter={() => setActiveTrendIndex(index)}
                        />
                        <circle
                          cx={point.x}
                          cy={point.yGross}
                          r={activeTrendIndex === index ? 1.3 : 0.9}
                          className={styles.chartDotGross}
                          onMouseEnter={() => setActiveTrendIndex(index)}
                        />
                      </g>
                    ))}
                    {chartPoints.map((point, index) => (
                      <text
                        key={`label-${point.label}-${index}`}
                        x={point.x}
                        y={39}
                        textAnchor="middle"
                        className={styles.chartText}
                      >
                        {point.label}
                      </text>
                    ))}
                  </svg>
                  {activePoint && (
                    <div
                      className={styles.chartTooltip}
                      style={{ left: `${tooltipLeft}%` }}
                    >
                      <div className={styles.tooltipTitle}>
                        {activePoint.label}
                      </div>
                      <div className={styles.tooltipRow}>
                        <span className={styles.tooltipDotNet} />
                        Net {money.format(activePoint.net)}
                      </div>
                      <div className={styles.tooltipRow}>
                        <span className={styles.tooltipDotGross} />
                        Gross {money.format(activePoint.gross)}
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.legend}>
                  <span>
                    <span
                      className={styles.legendDot}
                      style={{ background: '#2563eb' }}
                    />
                    Net
                  </span>
                  <span>
                    <span
                      className={styles.legendDot}
                      style={{ background: '#22c55e' }}
                    />
                    Gross
                  </span>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              className={`${styles.card} ${styles.stretchCard}`}
              title="Invoice funnel"
            >
              <div className={styles.funnelSummary}>
                <Typography.Text type="secondary">
                  Total: {invoiceFunnelTotal}
                </Typography.Text>
              </div>
              <div className={styles.funnel}>
                {invoiceFunnel.map((item) => {
                  const percent =
                    invoiceFunnelTotal > 0
                      ? Math.round((item.count / invoiceFunnelTotal) * 100)
                      : 0;
                  return (
                    <button
                      key={item.status}
                      type="button"
                      className={styles.funnelItem}
                      onClick={() =>
                        history.push(`/billing/invoices?status=${item.status}`)
                      }
                    >
                      <div className={styles.funnelLabel}>
                        <span
                          className={`${styles.funnelDot} ${
                            item.status === 'PAID'
                              ? styles.funnelPaid
                              : item.status === 'OVERDUE'
                              ? styles.funnelOverdue
                              : item.status === 'SENT'
                              ? styles.funnelSent
                              : item.status === 'RETURNED'
                              ? styles.funnelReturned
                              : styles.funnelIssued
                          }`}
                        />
                        <Typography.Text>{item.status}</Typography.Text>
                      </div>
                      <Typography.Text className={styles.funnelCount}>
                        {item.count}
                      </Typography.Text>
                      <div className={styles.funnelBar}>
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <Typography.Text type="secondary">
                        {percent}%
                      </Typography.Text>
                    </button>
                  );
                })}
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              className={styles.card}
              title="Cashflow snapshot"
              extra={
                <Typography.Text type="secondary">
                  Overdue: {money.format(cashflow.totalOverdue)}
                </Typography.Text>
              }
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                dataSource={cashflow.buckets.map((b) => ({
                  key: b.label,
                  bucket: b.label,
                  count: b.count,
                  amount: money.format(b.amount),
                }))}
                columns={[
                  { title: 'Bucket', dataIndex: 'bucket' },
                  { title: 'Count', dataIndex: 'count' },
                  { title: 'Amount', dataIndex: 'amount', align: 'right' },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              className={styles.card}
              title="Recurring calendar (next 30 days)"
              extra={
                <Button
                  size="small"
                  onClick={() => history.push('/billing/recurring-plans')}
                >
                  View plans
                </Button>
              }
            >
              {loadingPlans ? (
                <Typography.Text type="secondary">
                  Loading plans...
                </Typography.Text>
              ) : upcomingRuns.length ? (
                <Timeline
                  items={upcomingRuns.map((plan) => ({
                    color: plan.status === 'ACTIVE' ? 'green' : 'gray',
                    label: plan.nextRun,
                    children: (
                      <Space direction="vertical" size={0}>
                        <Typography.Text strong>
                          {plan.customer}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {plan.plan} • {plan.amount}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Typography.Text type="secondary">
                  No runs scheduled in the next 30 days
                </Typography.Text>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card className={styles.card} title="Top customers">
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                dataSource={topCustomers}
                columns={[
                  { title: 'Customer', dataIndex: 'customer' },
                  {
                    title: 'Revenue',
                    dataIndex: 'revenue',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: 'Overdue',
                    dataIndex: 'overdueCount',
                    align: 'center',
                  },
                  {
                    title: 'Risk',
                    dataIndex: 'risk',
                    render: (val: string) => (
                      <Tag
                        color={
                          val === 'High'
                            ? 'red'
                            : val === 'Medium'
                            ? 'orange'
                            : 'green'
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
          <Col xs={24} lg={12}>
            <Card className={styles.card} title="Exceptions and alerts">
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

        <Row gutter={[16, 16]}>
          <Col xs={24}>
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
      </div>
    </PageContainer>
  );
};

export default HomePage;
