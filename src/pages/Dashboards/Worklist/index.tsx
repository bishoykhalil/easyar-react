import { listCustomers, type CustomerDTO } from '@/services/customers';
import {
  listInvoicesPaged,
  type InvoiceResponseDTO,
} from '@/services/invoices';
import { listPlans, type RecurringPlanDTO } from '@/services/recurring';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
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
        type: 'Returned invoice',
        title: inv.invoiceNumber || `#${inv.id}`,
        detail: inv.customerName,
        severity: 'medium',
        actionLabel: 'Review',
        actionPath: '/billing/invoices?status=RETURNED',
      });
    });
    const overdue = invoices.filter(
      (inv) => inv.overdue || inv.status === 'OVERDUE',
    );
    overdue.forEach((inv) => {
      items.push({
        key: `overdue-${inv.id}`,
        type: 'Overdue invoice',
        title: inv.invoiceNumber || `#${inv.id}`,
        detail: inv.customerName,
        severity: 'high',
        actionLabel: 'Send reminder',
        actionPath: '/billing/invoices?status=OVERDUE',
      });
    });
    const notSent = invoices.filter(
      (inv) => inv.status === 'ISSUED' && !inv.sentAt,
    );
    notSent.forEach((inv) => {
      items.push({
        key: `unsent-${inv.id}`,
        type: 'Unsent invoice',
        title: inv.invoiceNumber || `#${inv.id}`,
        detail: inv.customerName,
        severity: 'medium',
        actionLabel: 'Send',
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
        type: 'Missing customer data',
        title: customer.name,
        detail: !customer.email ? 'Missing email' : 'Missing payment terms',
        severity: 'low',
        actionLabel: 'Fix',
        actionPath: '/billing/customers',
      });
    });
    const plansNoItems = plans.filter((p) => !p.items || p.items.length === 0);
    plansNoItems.forEach((plan) => {
      items.push({
        key: `plan-items-${plan.id}`,
        type: 'Plan has no items',
        title: `Plan #${plan.id}`,
        detail: plan.customerName,
        severity: 'high',
        actionLabel: 'Review',
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
        type: 'Plan expiring',
        title: `Plan #${plan.id}`,
        detail: `${plan.customerName} • ${plan.nextRunDate}`,
        severity: 'medium',
        actionLabel: 'Renew',
        actionPath: '/billing/recurring-plans',
      });
    });
    return items;
  }, [invoices, customers, plans]);

  const counts = useMemo(() => {
    return {
      total: workItems.length,
      high: workItems.filter((item) => item.severity === 'high').length,
      medium: workItems.filter((item) => item.severity === 'medium').length,
      low: workItems.filter((item) => item.severity === 'low').length,
    };
  }, [workItems]);

  return (
    <PageContainer title="Operational Worklist">
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          {[
            { title: 'Total items', value: counts.total },
            { title: 'High priority', value: counts.high },
            { title: 'Medium priority', value: counts.medium },
            { title: 'Low priority', value: counts.low },
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
            <Card className={styles.card} title="Needs action">
              <Table
                className={styles.table}
                size="small"
                pagination={{ pageSize: 10 }}
                loading={loading}
                dataSource={workItems}
                columns={[
                  { title: 'Type', dataIndex: 'type' },
                  { title: 'Item', dataIndex: 'title' },
                  { title: 'Detail', dataIndex: 'detail' },
                  {
                    title: 'Severity',
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
                        {val.toUpperCase()}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Action',
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
