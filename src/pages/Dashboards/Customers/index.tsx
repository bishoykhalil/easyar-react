import { listCustomers, type CustomerDTO } from '@/services/customers';
import {
  listInvoicesPaged,
  type InvoiceResponseDTO,
} from '@/services/invoices';
import { listPlans, type RecurringPlanDTO } from '@/services/recurring';
import { PageContainer } from '@ant-design/pro-components';
import { getLocale, history, useIntl } from '@umijs/max';
import { Button, Card, Col, Row, Table, Tag } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles.less';

type CustomerRow = {
  key: string;
  customer: string;
  revenue: number;
  outstanding: number;
  overdue: number;
  lastPayment?: string;
  recurringValue: number;
  risk: string;
};

const CustomerHealthDashboard: React.FC = () => {
  const intl = useIntl();
  const money = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'EUR',
  });
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

  const calcPlanAmount = (plan: RecurringPlanDTO) =>
    plan.items.reduce((sum, item) => {
      const qty = item.quantity || 0;
      const unit = item.unitPriceNet || 0;
      const discount = item.discountPercent || 0;
      const net = qty * unit * (1 - discount / 100);
      const vat = net * (item.vatRate || 0);
      return sum + net + vat;
    }, 0);

  const rows: CustomerRow[] = useMemo(() => {
    const openStatuses = ['ISSUED', 'SENT', 'RETURNED', 'OVERDUE'];
    const planMap = new Map<string, number>();
    plans.forEach((plan) => {
      const key = plan.customerName || '';
      planMap.set(key, (planMap.get(key) || 0) + calcPlanAmount(plan));
    });

    return customers.map((customer) => {
      const customerInvoices = invoices.filter(
        (inv) => inv.customerId === customer.id,
      );
      const revenue = customerInvoices.reduce(
        (sum, inv) => sum + (inv.totalGross || 0),
        0,
      );
      const outstanding = customerInvoices
        .filter((inv) => openStatuses.includes(inv.status))
        .reduce((sum, inv) => sum + (inv.totalGross || 0), 0);
      const overdue = customerInvoices
        .filter((inv) => inv.overdue || inv.status === 'OVERDUE')
        .reduce((sum, inv) => sum + (inv.totalGross || 0), 0);
      const lastPayment = customerInvoices
        .filter((inv) => inv.paidAt)
        .map((inv) => inv.paidAt as string)
        .sort()
        .slice(-1)[0];
      let risk = 'Low';
      if (overdue > 0) {
        risk = overdue > outstanding * 0.5 ? 'High' : 'Medium';
      } else if (outstanding > 0) {
        risk = 'Medium';
      }
      return {
        key: String(customer.id || customer.name),
        customer: customer.name,
        revenue,
        outstanding,
        overdue,
        lastPayment,
        recurringValue: planMap.get(customer.name) || 0,
        risk,
      };
    });
  }, [customers, invoices, plans]);

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });
  const riskLabel = (risk: string) => t(`status.${risk.toLowerCase()}`, risk);

  return (
    <PageContainer title={t('page.dashboards.customers', 'Customer Health')}>
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              className={styles.card}
              title={t('dash.customers.riskOverview', 'Customer risk overview')}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={{ pageSize: 8 }}
                loading={loading}
                dataSource={rows}
                columns={[
                  {
                    title: t('table.customer', 'Customer'),
                    dataIndex: 'customer',
                  },
                  {
                    title: t('table.revenue', 'Revenue'),
                    dataIndex: 'revenue',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: t('table.outstanding', 'Outstanding'),
                    dataIndex: 'outstanding',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: t('table.overdue', 'Overdue'),
                    dataIndex: 'overdue',
                    align: 'right',
                    render: (val: number) => money.format(val),
                  },
                  {
                    title: t('table.lastPayment', 'Last Payment'),
                    dataIndex: 'lastPayment',
                    render: (val?: string) =>
                      val ? new Date(val).toISOString().slice(0, 10) : '—',
                  },
                  {
                    title: t('table.recurringValue', 'Recurring value'),
                    dataIndex: 'recurringValue',
                    align: 'right',
                    render: (val: number) => money.format(val),
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
                  {
                    title: t('table.actions', 'Actions'),
                    key: 'action',
                    render: (_: any, record: CustomerRow) => (
                      <Button
                        size="small"
                        type="link"
                        onClick={() =>
                          history.push(
                            `/billing/customers?customer=${encodeURIComponent(
                              record.customer,
                            )}`,
                          )
                        }
                      >
                        {t('action.viewCustomer', 'View customer')}
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

export default CustomerHealthDashboard;
