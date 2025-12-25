import {
  createPlan,
  deletePlan,
  generateNow,
  listPlans,
  setPlanActive,
  updatePlan,
  type RecurringPlanDTO,
} from '@/services/recurring';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { Badge, Button, message, Popconfirm, Space, Tooltip } from 'antd';
import React, { useRef, useState } from 'react';
import PlanForm from './components/PlanForm';

const RecurringPlansPage: React.FC = () => {
  const actionRef = useRef<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPlanDTO | undefined>(
    undefined,
  );

  const columns: ProColumns<RecurringPlanDTO>[] = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, r) => {
        if (r.status === 'EXPIRED')
          return <Badge status="error" text="Expired" />;
        if (r.status === 'PAUSED' || r.active === false)
          return <Badge status="default" text="Paused" />;
        return <Badge status="success" text="Active" />;
      },
      valueType: 'select',
      valueEnum: {
        ACTIVE: { text: 'Active' },
        PAUSED: { text: 'Paused' },
        EXPIRED: { text: 'Expired' },
      },
    },
    {
      title: 'Next Run',
      dataIndex: 'nextRunDate',
      valueType: 'date',
    },
    {
      title: 'Count',
      dataIndex: 'generatedCount',
      render: (_, r) => `${r.generatedCount}/${r.maxOccurrences}`,
    },
    {
      title: 'Remaining',
      dataIndex: 'remainingOccurrences',
      render: (_, r) =>
        r.remainingOccurrences ?? r.maxOccurrences - r.generatedCount,
    },
    {
      title: 'Active',
      dataIndex: 'active',
      render: (_, r) =>
        r.active ? (
          <Badge status="success" text="Active" />
        ) : (
          <Badge status="default" text="Inactive" />
        ),
      valueType: 'select',
      valueEnum: {
        true: { text: 'Active' },
        false: { text: 'Inactive' },
      },
    },
    {
      title: 'Actions',
      valueType: 'option',
      render: (_, record) => {
        const exhausted =
          record.remainingOccurrences !== undefined
            ? record.remainingOccurrences <= 0
            : record.generatedCount >= record.maxOccurrences;
        const paused = record.status === 'PAUSED' || record.active === false;
        const expired = record.status === 'EXPIRED';
        const canGenerate = record.active && !paused && !expired && !exhausted;
        const generateBtn = (
          <Button
            size="small"
            type="link"
            disabled={!canGenerate}
            onClick={async () => {
              try {
                await generateNow(record.id);
                message.success('Invoice generated');
                actionRef.current?.reload();
              } catch (err: any) {
                message.error(err?.data?.message || 'Generate failed');
              }
            }}
          >
            Generate Now
          </Button>
        );

        return (
          <Space>
            <Button
              size="small"
              type="link"
              onClick={() => {
                setEditing(record);
                setFormOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              type="link"
              onClick={async () => {
                try {
                  await setPlanActive(record.id, !record.active);
                  message.success(record.active ? 'Deactivated' : 'Activated');
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(err?.data?.message || 'Toggle failed');
                }
              }}
            >
              {record.active ? 'Deactivate' : 'Activate'}
            </Button>
            {canGenerate ? (
              generateBtn
            ) : (
              <Tooltip
                title={
                  expired
                    ? 'Plan expired (max occurrences reached)'
                    : paused
                    ? 'Plan is paused'
                    : exhausted
                    ? 'Max occurrences reached'
                    : 'Plan is inactive'
                }
              >
                <span>{generateBtn}</span>
              </Tooltip>
            )}
            <Popconfirm
              title="Delete plan?"
              onConfirm={async () => {
                try {
                  await deletePlan(record.id);
                  message.success('Deleted');
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(err?.data?.message || 'Delete failed');
                }
              }}
            >
              <a style={{ color: 'red' }}>Delete</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<RecurringPlanDTO>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async () => {
          try {
            const res = await listPlans();
            return {
              data: res.data || [],
              success: true,
            };
          } catch (err: any) {
            message.error(err?.data?.message || 'Failed to load plans');
            return { data: [], success: false };
          }
        }}
        toolbar={{
          title: 'Recurring Plans',
          actions: [
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              New Plan
            </Button>,
          ],
        }}
      />

      <PlanForm
        open={formOpen}
        initialValues={editing}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(undefined);
        }}
        onFinish={async (values) => {
          try {
            if (editing?.id) {
              await updatePlan(editing.id, values);
            } else {
              await createPlan(values);
            }
            message.success(editing?.id ? 'Updated' : 'Created');
            actionRef.current?.reload();
            return true;
          } catch (err: any) {
            message.error(err?.data?.message || 'Save failed');
            return false;
          }
        }}
      />
    </PageContainer>
  );
};

export default RecurringPlansPage;
