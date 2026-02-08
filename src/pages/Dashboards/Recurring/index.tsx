import { listPlans, type RecurringPlanDTO } from '@/services/recurring';
import { PageContainer } from '@ant-design/pro-components';
import { getLocale, useIntl } from '@umijs/max';
import { Card, Col, Row, Space, Table, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles.less';

const RecurringOpsDashboard: React.FC = () => {
  const intl = useIntl();
  const money = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'EUR',
  });
  const [plans, setPlans] = useState<RecurringPlanDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await listPlans();
        setPlans(res.data || []);
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
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

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  const calcAmount = (plan: RecurringPlanDTO) =>
    plan.items.reduce((sum, item) => {
      const qty = item.quantity || 0;
      const unit = item.unitPriceNet || 0;
      const discount = item.discountPercent || 0;
      const net = qty * unit * (1 - discount / 100);
      const vat = net * (item.vatRate || 0);
      return sum + net + vat;
    }, 0);

  const metrics = useMemo(() => {
    const activePlans = plans.filter((p) => p.status === 'ACTIVE' || p.active);
    const pausedPlans = plans.filter(
      (p) =>
        p.status === 'PAUSED' || (p.active === false && p.status !== 'EXPIRED'),
    );
    const expiring = plans.filter((p) => {
      const remaining =
        p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount;
      return remaining <= 1 && remaining >= 0;
    });
    const itemsMissing = plans.filter((p) => !p.items || p.items.length === 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(today.getDate() + 7);
    const dueToday = activePlans.filter((p) => {
      const next = parseDate(p.nextRunDate);
      return next && next.getTime() === today.getTime();
    });
    const dueWeek = activePlans.filter((p) => {
      const next = parseDate(p.nextRunDate);
      return next && next >= today && next <= week;
    });
    return {
      active: activePlans.length,
      paused: pausedPlans.length,
      expiring: expiring.length,
      missingItems: itemsMissing.length,
      dueToday: dueToday.length,
      dueWeek: dueWeek.length,
    };
  }, [plans]);

  const runsThisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(today.getDate() + 7);
    return plans
      .filter((p) => p.status === 'ACTIVE' || p.active)
      .filter((p) => {
        const next = parseDate(p.nextRunDate);
        return next && next >= today && next <= week;
      })
      .map((p) => ({
        key: p.id,
        plan: `Plan #${p.id}`,
        customer: p.customerName,
        nextRun: p.nextRunDate,
        remaining:
          p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount,
        amount: calcAmount(p),
      }))
      .sort((a, b) => (a.nextRun || '').localeCompare(b.nextRun || ''));
  }, [plans]);

  const expiringPlans = useMemo(() => {
    return plans
      .filter((p) => {
        const remaining =
          p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount;
        return remaining <= 2 && remaining >= 0;
      })
      .map((p) => ({
        key: p.id,
        plan: `Plan #${p.id}`,
        customer: p.customerName,
        remaining:
          p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount,
        nextRun: p.nextRunDate,
        amount: calcAmount(p),
      }));
  }, [plans]);

  return (
    <PageContainer title={t('page.dashboards.recurring', 'Recurring Ops')}>
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          {[
            {
              title: t('dash.recurring.kpi.dueToday', 'Runs due today'),
              value: metrics.dueToday,
            },
            {
              title: t('dash.recurring.kpi.dueWeek', 'Runs due this week'),
              value: metrics.dueWeek,
            },
            {
              title: t('dash.recurring.kpi.activePlans', 'Active plans'),
              value: metrics.active,
            },
            {
              title: t('dash.recurring.kpi.pausedPlans', 'Paused plans'),
              value: metrics.paused,
            },
            {
              title: t('dash.recurring.kpi.expiringSoon', 'Expiring soon'),
              value: metrics.expiring,
            },
            {
              title: t('dash.recurring.kpi.missingItems', 'Missing items'),
              value: metrics.missingItems,
            },
          ].map((item) => (
            <Col xs={24} sm={12} lg={4} key={item.title}>
              <Card className={styles.card} bordered>
                <Space direction="vertical" size={2}>
                  <Typography.Text className={styles.kpiLabel}>
                    {item.title}
                  </Typography.Text>
                  <Typography.Title level={4} className={styles.kpiValue}>
                    {item.value}
                  </Typography.Title>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              className={styles.card}
              title={t(
                'dash.recurring.runsNext7Days',
                'Runs due in the next 7 days',
              )}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                loading={loading}
                dataSource={runsThisWeek}
                columns={[
                  { title: t('table.plan', 'Plan'), dataIndex: 'plan' },
                  {
                    title: t('table.customer', 'Customer'),
                    dataIndex: 'customer',
                  },
                  {
                    title: t('table.nextRun', 'Next Run'),
                    dataIndex: 'nextRun',
                  },
                  {
                    title: t('table.remaining', 'Remaining'),
                    dataIndex: 'remaining',
                  },
                  {
                    title: t('table.amount', 'Amount'),
                    dataIndex: 'amount',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                ]}
                locale={{
                  emptyText: t(
                    'dash.recurring.emptyNext7Days',
                    'No runs due in the next 7 days',
                  ),
                }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              className={styles.card}
              title={t('dash.recurring.renewalPipeline', 'Renewal pipeline')}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                loading={loading}
                dataSource={expiringPlans}
                columns={[
                  { title: t('table.plan', 'Plan'), dataIndex: 'plan' },
                  {
                    title: t('table.customer', 'Customer'),
                    dataIndex: 'customer',
                  },
                  {
                    title: t('table.remaining', 'Remaining'),
                    dataIndex: 'remaining',
                  },
                  {
                    title: t('table.nextRun', 'Next Run'),
                    dataIndex: 'nextRun',
                  },
                ]}
                locale={{
                  emptyText: t(
                    'dash.recurring.emptyRenewal',
                    'No plans nearing renewal',
                  ),
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default RecurringOpsDashboard;
