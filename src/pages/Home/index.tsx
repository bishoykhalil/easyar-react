import { PageContainer } from '@ant-design/pro-components';
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
import styles from './index.less';

const HomePage: React.FC = () => {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'EUR',
  });

  const kpis = [
    {
      title: 'Open invoices',
      value: '12',
      note: '3 due this week',
    },
    {
      title: 'Overdue amount',
      value: money.format(2840.5),
      note: '2 invoices overdue',
    },
    {
      title: 'Recurring revenue',
      value: money.format(19832.97),
      note: 'This month',
    },
    {
      title: 'Active plans',
      value: '9',
      note: '2 paused, 1 expiring',
    },
  ];

  const upcomingRuns = [
    {
      key: 1,
      plan: 'Monthly Visit',
      customer: 'BOCH',
      nextRun: '2026-01-05',
      amount: money.format(114),
      status: 'ACTIVE',
    },
    {
      key: 2,
      plan: 'Maintenance',
      customer: 'NPM',
      nextRun: '2026-01-08',
      amount: money.format(990),
      status: 'ACTIVE',
    },
    {
      key: 3,
      plan: 'Quarterly Review',
      customer: 'OPL',
      nextRun: '2026-01-12',
      amount: money.format(300),
      status: 'PAUSED',
    },
  ];

  const openInvoices = [
    {
      key: 1,
      invoice: 'R-2026-0018',
      customer: 'BOCH',
      status: 'ISSUED',
      dueDate: '2026-01-17',
      amount: money.format(114),
    },
    {
      key: 2,
      invoice: 'R-2026-0016',
      customer: 'NPM',
      status: 'SENT',
      dueDate: '2026-01-09',
      amount: money.format(1980),
    },
    {
      key: 3,
      invoice: 'R-2026-0015',
      customer: 'MARIA',
      status: 'OVERDUE',
      dueDate: '2026-01-08',
      amount: money.format(4906),
    },
  ];

  const alerts = [
    {
      key: 1,
      title: 'Recurring run failed',
      detail: 'Plan #12 missing items (NPM)',
      tone: 'error',
    },
    {
      key: 2,
      title: 'Payment terms missing',
      detail: 'Customer: CCCC',
      tone: 'warning',
    },
    {
      key: 3,
      title: 'Plan expiring soon',
      detail: 'BOCH - 1 run remaining',
      tone: 'info',
    },
  ];

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
              extra={<Button size="small">View plans</Button>}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                dataSource={upcomingRuns}
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
              extra={<Button size="small">View invoices</Button>}
            >
              <Table
                className={styles.table}
                size="small"
                pagination={false}
                dataSource={openInvoices}
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
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default HomePage;
