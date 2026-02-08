import {
  listInvoicesPaged,
  type InvoiceResponseDTO,
} from '@/services/invoices';
import { listPlans, type RecurringPlanDTO } from '@/services/recurring';
import { PageContainer } from '@ant-design/pro-components';
import { getLocale, history, useIntl } from '@umijs/max';
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
  const intl = useIntl();
  const money = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'EUR',
  });
  const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];
  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, any>,
  ) => intl.formatMessage({ id, defaultMessage }, values);

  const statusLabel = (status: string) =>
    t(`status.${status.toLowerCase()}`, status);
  const riskLabel = (risk: string) => t(`status.${risk.toLowerCase()}`, risk);

  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [plans, setPlans] = useState<RecurringPlanDTO[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingInvoices(true);
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
        title: t('home.kpi.openInvoices', 'Open invoices'),
        value: String(open.length),
        note: intl.formatMessage(
          {
            id: 'home.kpi.dueThisWeek',
            defaultMessage: '{count} due this week',
          },
          { count: dueSoon.length },
        ),
      },
      {
        title: t('home.kpi.overdueAmount', 'Overdue amount'),
        value: money.format(
          overdue.reduce((sum, inv) => sum + (inv.totalGross || 0), 0),
        ),
        note: intl.formatMessage(
          {
            id: 'home.kpi.invoicesOverdue',
            defaultMessage: '{count} invoices overdue',
          },
          { count: overdue.length },
        ),
      },
      {
        title: t('home.kpi.recurringRevenue', 'Recurring revenue'),
        value: money.format(recurringTotal),
        note: t('home.kpi.thisMonth', 'This month'),
      },
      {
        title: t('home.kpi.activePlans', 'Active plans'),
        value: String(activePlans.length),
        note: intl.formatMessage(
          {
            id: 'home.kpi.plansNote',
            defaultMessage: '{paused} paused, {expiring} expiring',
          },
          { paused: pausedPlans.length, expiring: expiringPlans.length },
        ),
      },
    ];
  }, [invoices, plans, money]);

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

  const todayActions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unsentIssued = invoices.filter(
      (inv) => inv.status === 'ISSUED' && !inv.sentAt,
    ).length;
    const overdue = invoices.filter(
      (inv) => inv.overdue || inv.status === 'OVERDUE',
    ).length;
    const returned = invoices.filter((inv) => inv.status === 'RETURNED').length;
    const runsToday = plans.filter((plan) => {
      const next = parseDate(plan.nextRunDate);
      const active = plan.status === 'ACTIVE' || plan.active;
      return (
        active &&
        next &&
        next.getFullYear() === today.getFullYear() &&
        next.getMonth() === today.getMonth() &&
        next.getDate() === today.getDate()
      );
    }).length;
    return { unsentIssued, overdue, returned, runsToday };
  }, [invoices, plans]);

  const cashInForecast = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weeks = [
      { label: t('home.forecast.w1', '0-7 days'), from: 0, to: 7 },
      { label: t('home.forecast.w2', '8-14 days'), from: 8, to: 14 },
      { label: t('home.forecast.w3', '15-21 days'), from: 15, to: 21 },
      { label: t('home.forecast.w4', '22-30 days'), from: 22, to: 30 },
    ].map((w) => ({ ...w, count: 0, amount: 0 }));

    invoices
      .filter((inv) => openStatuses.includes(inv.status))
      .forEach((inv) => {
        const due = parseDate(inv.dueDate);
        if (!due) return;
        due.setHours(0, 0, 0, 0);
        const diff = Math.floor(
          (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const bucket = weeks.find((w) => diff >= w.from && diff <= w.to);
        if (!bucket) return;
        bucket.count += 1;
        bucket.amount += inv.totalGross || 0;
      });
    return weeks;
  }, [invoices, openStatuses, t]);

  const collectionPerformance = useMemo(() => {
    const total = invoices.length || 1;
    const paid = invoices.filter((i) => i.status === 'PAID').length;
    const overdue = invoices.filter(
      (i) => i.overdue || i.status === 'OVERDUE',
    ).length;
    const returned = invoices.filter((i) => i.status === 'RETURNED').length;
    const onTimePct = Math.round((paid / total) * 100);
    const overduePct = Math.round((overdue / total) * 100);
    const returnedPct = Math.round((returned / total) * 100);
    return { onTimePct, overduePct, returnedPct, total };
  }, [invoices]);

  const topRisks = useMemo(() => {
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

  const recentActivity = useMemo(() => {
    const rows: {
      key: string;
      when: Date;
      title: string;
      detail: string;
    }[] = [];

    invoices.forEach((inv) => {
      const base = inv.invoiceNumber || `#${inv.id}`;
      const issuedAt = parseDate(inv.issuedAt || inv.createdAt);
      const sentAt = parseDate(inv.sentAt);
      const paidAt = parseDate(inv.paidAt);
      const returnedAt = parseDate(inv.returnedAt);
      if (issuedAt) {
        rows.push({
          key: `inv-issued-${inv.id}`,
          when: issuedAt,
          title: t('activity.invoiceIssued', 'Invoice issued'),
          detail: `${base} • ${inv.customerName || '-'}`,
        });
      }
      if (sentAt) {
        rows.push({
          key: `inv-sent-${inv.id}`,
          when: sentAt,
          title: t('activity.invoiceSent', 'Invoice sent'),
          detail: `${base} • ${inv.customerName || '-'}`,
        });
      }
      if (paidAt) {
        rows.push({
          key: `inv-paid-${inv.id}`,
          when: paidAt,
          title: t('activity.invoicePaid', 'Invoice paid'),
          detail: `${base} • ${money.format(inv.totalGross || 0)}`,
        });
      }
      if (returnedAt) {
        rows.push({
          key: `inv-returned-${inv.id}`,
          when: returnedAt,
          title: t('activity.invoiceReturned', 'Invoice returned'),
          detail: `${base} • ${inv.customerName || '-'}`,
        });
      }
    });

    plans.forEach((plan) => {
      const createdAt = parseDate(plan.createdAt);
      if (createdAt) {
        rows.push({
          key: `plan-created-${plan.id}`,
          when: createdAt,
          title: t('activity.planCreated', 'Recurring plan created'),
          detail: `Plan #${plan.id} • ${plan.customerName || '-'}`,
        });
      }
      const lastRunDate = parseDate(plan.lastRunDate);
      if (lastRunDate) {
        rows.push({
          key: `plan-run-${plan.id}`,
          when: lastRunDate,
          title: t('activity.planRun', 'Recurring run generated'),
          detail: `Plan #${plan.id} • ${plan.customerName || '-'}`,
        });
      }
    });

    return rows
      .sort((a, b) => b.when.getTime() - a.when.getTime())
      .slice(0, 8)
      .map((r) => ({
        ...r,
        whenText: r.when.toLocaleString(getLocale() || 'en-US'),
      }));
  }, [invoices, plans, money, t]);

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
        title: t('home.alert.overdueInvoices.title', 'Overdue invoices'),
        detail: t(
          'home.alert.overdueInvoices.detail',
          '{count} invoices need attention',
          { count: overdue.length },
        ),
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
        title: t('home.alert.plansPaused.title', 'Plans paused'),
        detail: t(
          'home.alert.plansPaused.detail',
          '{count} recurring plans are paused',
          { count: paused.length },
        ),
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
        title: t('home.alert.plansExpiring.title', 'Plans expiring soon'),
        detail: t(
          'home.alert.plansExpiring.detail',
          '{count} plan(s) have 1 run left',
          { count: expiring.length },
        ),
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
        title: t(
          'home.alert.missingPaymentTerms.title',
          'Missing payment terms',
        ),
        detail: t(
          'home.alert.missingPaymentTerms.detail',
          '{count} invoice(s) without payment terms',
          { count: missingTerms.length },
        ),
        tone: 'warning',
      });
    }
    const plansWithoutItems = plans.filter(
      (p) => !p.items || p.items.length === 0,
    );
    if (plansWithoutItems.length) {
      items.push({
        key: 5,
        title: t('home.alert.plansWithoutItems.title', 'Plans without items'),
        detail: t(
          'home.alert.plansWithoutItems.detail',
          '{count} plan(s) have no items',
          { count: plansWithoutItems.length },
        ),
        tone: 'error',
      });
    }
    const notSent = invoices.filter(
      (inv) => inv.status === 'ISSUED' && !inv.sentAt,
    );
    if (notSent.length) {
      items.push({
        key: 6,
        title: t('home.alert.invoicesNotSent.title', 'Invoices not sent'),
        detail: t(
          'home.alert.invoicesNotSent.detail',
          '{count} issued invoice(s) without email sent',
          { count: notSent.length },
        ),
        tone: 'info',
      });
    }
    return items;
  }, [invoices, plans]);

  return (
    <PageContainer title={t('page.home', 'Home')}>
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
          <Col xs={24} lg={16}>
            <Card
              className={styles.card}
              title={t('home.todayActions', 'Today actions')}
            >
              <div className={styles.actionGrid}>
                <button
                  type="button"
                  className={styles.actionTile}
                  onClick={() =>
                    history.push('/billing/invoices?status=ISSUED')
                  }
                >
                  <div className={styles.actionCount}>
                    {todayActions.unsentIssued}
                  </div>
                  <div className={styles.actionLabel}>
                    {t('home.action.unsentIssued', 'Unsent issued invoices')}
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.actionTile}
                  onClick={() =>
                    history.push('/billing/invoices?status=OVERDUE')
                  }
                >
                  <div className={styles.actionCount}>
                    {todayActions.overdue}
                  </div>
                  <div className={styles.actionLabel}>
                    {t('home.action.overdue', 'Overdue invoices')}
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.actionTile}
                  onClick={() => history.push('/billing/recurring-plans')}
                >
                  <div className={styles.actionCount}>
                    {todayActions.runsToday}
                  </div>
                  <div className={styles.actionLabel}>
                    {t('home.action.runsToday', 'Recurring runs due today')}
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.actionTile}
                  onClick={() =>
                    history.push('/billing/invoices?status=RETURNED')
                  }
                >
                  <div className={styles.actionCount}>
                    {todayActions.returned}
                  </div>
                  <div className={styles.actionLabel}>
                    {t('home.action.returned', 'Returned invoices')}
                  </div>
                </button>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              className={styles.card}
              title={t('home.quickActions', 'Quick actions')}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => history.push('/billing/orders')}>
                  {t('action.newOrder', 'New Order')}
                </Button>
                <Button block onClick={() => history.push('/billing/invoices')}>
                  {t('action.newFromOrder', 'New from Order')}
                </Button>
                <Button
                  block
                  onClick={() => history.push('/billing/recurring-plans')}
                >
                  {t('action.generateNow', 'Generate Now')}
                </Button>
                <Button
                  block
                  onClick={() =>
                    history.push('/billing/invoices?status=OVERDUE')
                  }
                >
                  {t('action.viewOverdue', 'View overdue')}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className={styles.topRow}>
          <Col xs={24} lg={8}>
            <Card
              className={`${styles.card} ${styles.stretchCard}`}
              title={t('home.invoiceFunnel.title', 'Invoice funnel')}
            >
              <div className={styles.funnelSummary}>
                <Typography.Text type="secondary">
                  {t('label.total', 'Total')}: {invoiceFunnelTotal}
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
                        <Typography.Text>
                          {statusLabel(item.status)}
                        </Typography.Text>
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
          <Col xs={24} lg={16}>
            <Card
              className={`${styles.card} ${styles.stretchCard}`}
              title={t('home.collectionPerformance', 'Collection performance')}
            >
              <div className={styles.metricRow}>
                <div className={styles.metricTile}>
                  <div className={styles.metricTitle}>
                    {t('home.metric.totalInvoices', 'Total invoices')}
                  </div>
                  <div className={styles.metricValue}>
                    {collectionPerformance.total}
                  </div>
                </div>
                <div className={styles.metricTile}>
                  <div className={styles.metricTitle}>
                    {t('home.metric.onTimePaid', 'Paid ratio')}
                  </div>
                  <div className={styles.metricValue}>
                    {collectionPerformance.onTimePct}%
                  </div>
                </div>
                <div className={styles.metricTile}>
                  <div className={styles.metricTitle}>
                    {t('home.metric.overdueRatio', 'Overdue ratio')}
                  </div>
                  <div className={styles.metricValue}>
                    {collectionPerformance.overduePct}%
                  </div>
                </div>
                <div className={styles.metricTile}>
                  <div className={styles.metricTitle}>
                    {t('home.metric.returnedRatio', 'Returned ratio')}
                  </div>
                  <div className={styles.metricValue}>
                    {collectionPerformance.returnedPct}%
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              className={styles.card}
              title={t(
                'home.cashInForecast',
                'Cash-in forecast (next 30 days)',
              )}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                loading={loadingInvoices}
                dataSource={cashInForecast.map((w) => ({ ...w, key: w.label }))}
                columns={[
                  { title: t('table.period', 'Period'), dataIndex: 'label' },
                  {
                    title: t('table.invoices', 'Invoices'),
                    dataIndex: 'count',
                  },
                  {
                    title: t('table.expectedCashIn', 'Expected cash-in'),
                    dataIndex: 'amount',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              className={styles.card}
              title={t('home.topRisks', 'Top risks')}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                loading={loadingInvoices}
                dataSource={topRisks}
                columns={[
                  {
                    title: t('table.customer', 'Customer'),
                    dataIndex: 'customer',
                  },
                  {
                    title: t('table.overdueAmount', 'Overdue amount'),
                    dataIndex: 'overdueAmount',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: t('table.open', 'Open'),
                    dataIndex: 'open',
                    align: 'center',
                  },
                  {
                    title: t('table.risk', 'Risk'),
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
                        {riskLabel(val)}
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              className={styles.card}
              title={t('home.recentActivity', 'Recent activity')}
            >
              {recentActivity.length ? (
                <List
                  dataSource={recentActivity}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={0}>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Typography.Text type="secondary">
                          {item.detail}
                        </Typography.Text>
                      </Space>
                      <Typography.Text type="secondary">
                        {item.whenText}
                      </Typography.Text>
                    </List.Item>
                  )}
                />
              ) : (
                <Typography.Text type="secondary">
                  {t('empty.activity', 'No recent activity')}
                </Typography.Text>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              className={styles.card}
              title={t('section.exceptionsAlerts', 'Exceptions and alerts')}
            >
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
                        {t(`tone.${item.tone}`, item.tone.toUpperCase())}
                      </Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <Typography.Text type="secondary">
                  {t('empty.alerts', 'No alerts right now')}
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
