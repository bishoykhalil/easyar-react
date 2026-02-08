import { listCustomers, type CustomerDTO } from '@/services/customers';
import {
  listInvoicesPaged,
  type InvoiceResponseDTO,
} from '@/services/invoices';
import { listPlans, type RecurringPlanDTO } from '@/services/recurring';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl } from '@umijs/max';
import { Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles.less';

type WorkItem = {
  key: string;
  type: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionPath: string;
};

const WorklistDashboard: React.FC = () => {
  const intl = useIntl();
  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, any>,
  ) => intl.formatMessage({ id, defaultMessage }, values);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [plans, setPlans] = useState<RecurringPlanDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [customerRes, invoiceRes, planRes] = await Promise.all([
          listCustomers({ search: '%' }),
          listInvoicesPaged({
            q: '%',
            page: 0,
            size: 500,
            sort: 'createdAt,desc',
          }),
          listPlans(),
        ]);
        setCustomers(customerRes.data || []);
        setInvoices(invoiceRes.data?.content || []);
        setPlans(planRes.data || []);
      } catch {
        setCustomers([]);
        setInvoices([]);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const workItems = useMemo(() => {
    const items: WorkItem[] = [];
    const returned = invoices.filter((inv) => inv.status === 'RETURNED');
    returned.forEach((inv) => {
      items.push({
        key: `returned-${inv.id}`,
        type: t('worklist.type.returnedInvoice', 'Returned invoice'),
        title: inv.invoiceNumber || `#${inv.id}`,
        detail: inv.customerName,
        severity: 'medium',
        actionLabel: t('action.review', 'Review'),
        actionPath: '/billing/invoices?status=RETURNED',
      });
    });
    const overdue = invoices.filter(
      (inv) => inv.overdue || inv.status === 'OVERDUE',
    );
    overdue.forEach((inv) => {
      items.push({
        key: `overdue-${inv.id}`,
        type: t('worklist.type.overdueInvoice', 'Overdue invoice'),
        title: inv.invoiceNumber || `#${inv.id}`,
        detail: inv.customerName,
        severity: 'high',
        actionLabel: t('action.sendReminder', 'Send reminder'),
        actionPath: '/billing/invoices?status=OVERDUE',
      });
    });
    const notSent = invoices.filter(
      (inv) => inv.status === 'ISSUED' && !inv.sentAt,
    );
    notSent.forEach((inv) => {
      items.push({
        key: `unsent-${inv.id}`,
        type: t('worklist.type.unsentInvoice', 'Unsent invoice'),
        title: inv.invoiceNumber || `#${inv.id}`,
        detail: inv.customerName,
        severity: 'medium',
        actionLabel: t('action.send', 'Send'),
        actionPath: '/billing/invoices?status=ISSUED',
      });
    });
    const missingCustomerData = customers.filter(
      (c) =>
        !c.email ||
        c.paymentTermsDays === null ||
        c.paymentTermsDays === undefined,
    );
    missingCustomerData.forEach((customer) => {
      items.push({
        key: `customer-${customer.id}`,
        type: t('worklist.type.missingCustomerData', 'Missing customer data'),
        title: customer.name,
        detail: !customer.email
          ? t('worklist.detail.missingEmail', 'Missing email')
          : t('worklist.detail.missingPaymentTerms', 'Missing payment terms'),
        severity: 'low',
        actionLabel: t('action.fix', 'Fix'),
        actionPath: '/billing/customers',
      });
    });
    const plansNoItems = plans.filter((p) => !p.items || p.items.length === 0);
    plansNoItems.forEach((plan) => {
      items.push({
        key: `plan-items-${plan.id}`,
        type: t('worklist.type.planNoItems', 'Plan has no items'),
        title: `Plan #${plan.id}`,
        detail: plan.customerName,
        severity: 'high',
        actionLabel: t('action.review', 'Review'),
        actionPath: '/billing/recurring-plans',
      });
    });
    const expiring = plans.filter((p) => {
      const remaining =
        p.remainingOccurrences ?? p.maxOccurrences - p.generatedCount;
      return remaining <= 1 && remaining >= 0;
    });
    expiring.forEach((plan) => {
      items.push({
        key: `plan-expiring-${plan.id}`,
        type: t('worklist.type.planExpiring', 'Plan expiring'),
        title: `Plan #${plan.id}`,
        detail: `${plan.customerName} • ${plan.nextRunDate}`,
        severity: 'medium',
        actionLabel: t('action.renew', 'Renew'),
        actionPath: '/billing/recurring-plans',
      });
    });
    return items;
  }, [invoices, customers, plans, t]);

  const counts = useMemo(() => {
    return {
      total: workItems.length,
      high: workItems.filter((item) => item.severity === 'high').length,
      medium: workItems.filter((item) => item.severity === 'medium').length,
      low: workItems.filter((item) => item.severity === 'low').length,
    };
  }, [workItems]);

  return (
    <PageContainer title={t('page.dashboards.worklist', 'Worklist')}>
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          {[
            {
              title: t('dash.worklist.kpi.totalItems', 'Total items'),
              value: counts.total,
            },
            {
              title: t('dash.worklist.kpi.highPriority', 'High priority'),
              value: counts.high,
            },
            {
              title: t('dash.worklist.kpi.mediumPriority', 'Medium priority'),
              value: counts.medium,
            },
            {
              title: t('dash.worklist.kpi.lowPriority', 'Low priority'),
              value: counts.low,
            },
          ].map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.title}>
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
          <Col xs={24}>
            <Card
              className={styles.card}
              title={t('dash.worklist.needsAction', 'Needs action')}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={{ pageSize: 10 }}
                loading={loading}
                dataSource={workItems}
                columns={[
                  { title: t('table.type', 'Type'), dataIndex: 'type' },
                  { title: t('table.item', 'Item'), dataIndex: 'title' },
                  { title: t('table.detail', 'Detail'), dataIndex: 'detail' },
                  {
                    title: t('table.severity', 'Severity'),
                    dataIndex: 'severity',
                    render: (val: string) => (
                      <Tag
                        color={
                          val === 'high'
                            ? 'red'
                            : val === 'medium'
                            ? 'orange'
                            : 'green'
                        }
                      >
                        {t(`severity.${val}`, val.toUpperCase())}
                      </Tag>
                    ),
                  },
                  {
                    title: t('table.actions', 'Actions'),
                    render: (_: any, record: WorkItem) => (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => history.push(record.actionPath)}
                      >
                        {record.actionLabel}
                      </Button>
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

export default WorklistDashboard;
