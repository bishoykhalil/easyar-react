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
import { useIntl } from '@umijs/max';
import { Badge, Button, message, Popconfirm, Space, Tooltip } from 'antd';
import React, { useRef, useState } from 'react';
import PlanForm from './components/PlanForm';

const RecurringPlansPage: React.FC = () => {
  const actionRef = useRef<any>();
  const intl = useIntl();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPlanDTO | undefined>(
    undefined,
  );

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  const planFrequencyLabel = (frequency?: string) => {
    if (!frequency) return '-';
    return t(`frequency.${String(frequency).toLowerCase()}`, frequency);
  };

  const columns: ProColumns<RecurringPlanDTO>[] = [
    {
      title: t('table.customer', 'Customer'),
      dataIndex: 'customerName',
    },
    {
      title: t('table.frequency', 'Frequency'),
      dataIndex: 'frequency',
      render: (_, r) => planFrequencyLabel(r.frequency),
    },
    {
      title: t('table.status', 'Status'),
      dataIndex: 'status',
      render: (_, r) => {
        if (r.status === 'EXPIRED')
          return <Badge status="error" text={t('status.expired', 'Expired')} />;
        if (r.status === 'PAUSED' || r.active === false)
          return <Badge status="default" text={t('status.paused', 'Paused')} />;
        return <Badge status="success" text={t('status.active', 'Active')} />;
      },
      valueType: 'select',
      valueEnum: {
        ACTIVE: { text: t('status.active', 'Active') },
        PAUSED: { text: t('status.paused', 'Paused') },
        EXPIRED: { text: t('status.expired', 'Expired') },
      },
    },
    {
      title: t('table.nextRun', 'Next Run'),
      dataIndex: 'nextRunDate',
      valueType: 'date',
    },
    {
      title: t('table.lastRun', 'Last Run'),
      dataIndex: 'lastRunDate',
      valueType: 'date',
      render: (_, r) => r.lastRunDate || '-',
    },
    {
      title: t('table.count', 'Count'),
      dataIndex: 'generatedCount',
      render: (_, r) => `${r.generatedCount}/${r.maxOccurrences}`,
    },
    {
      title: t('table.remaining', 'Remaining'),
      dataIndex: 'remainingOccurrences',
      render: (_, r) =>
        r.remainingOccurrences ?? r.maxOccurrences - r.generatedCount,
    },
    {
      title: t('table.active', 'Active'),
      dataIndex: 'active',
      render: (_, r) =>
        r.active ? (
          <Badge status="success" text={t('status.active', 'Active')} />
        ) : (
          <Badge status="default" text={t('status.inactive', 'Inactive')} />
        ),
      valueType: 'select',
      valueEnum: {
        true: { text: t('status.active', 'Active') },
        false: { text: t('status.inactive', 'Inactive') },
      },
    },
    {
      title: t('table.actions', 'Actions'),
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
                const res = await generateNow(record.id);
                const invId = res?.data;
                message.success(
                  t('message.invoiceGenerated', 'Invoice generated'),
                );
                if (invId) {
                  window.open(`/billing/invoices?keyword=${invId}`, '_blank');
                }
                actionRef.current?.reload();
              } catch (err: any) {
                message.error(
                  err?.data?.message ||
                    t('error.generateFailed', 'Generate failed'),
                );
              }
            }}
          >
            {t('action.generateNow', 'Generate Now')}
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
              {t('action.edit', 'Edit')}
            </Button>
            <Button
              size="small"
              type="link"
              onClick={async () => {
                try {
                  await setPlanActive(record.id, !record.active);
                  message.success(
                    record.active
                      ? t('message.deactivated', 'Deactivated')
                      : t('message.activated', 'Activated'),
                  );
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(
                    err?.data?.message ||
                      t('error.toggleFailed', 'Toggle failed'),
                  );
                }
              }}
            >
              {record.active
                ? t('action.deactivate', 'Deactivate')
                : t('action.activate', 'Activate')}
            </Button>
            {canGenerate ? (
              generateBtn
            ) : (
              <Tooltip
                title={
                  expired
                    ? t(
                        'tooltip.planExpired',
                        'Plan expired (max occurrences reached)',
                      )
                    : paused
                    ? t('tooltip.planPaused', 'Plan is paused')
                    : exhausted
                    ? t(
                        'tooltip.maxOccurrencesReached',
                        'Max occurrences reached',
                      )
                    : t('tooltip.planInactive', 'Plan is inactive')
                }
              >
                <span>{generateBtn}</span>
              </Tooltip>
            )}
            <Popconfirm
              title={t('confirm.deletePlan', 'Delete plan?')}
              onConfirm={async () => {
                try {
                  await deletePlan(record.id);
                  message.success(t('message.deleted', 'Deleted'));
                  actionRef.current?.reload();
                } catch (err: any) {
                  message.error(
                    err?.data?.message ||
                      t('error.deleteFailed', 'Delete failed'),
                  );
                }
              }}
            >
              <a style={{ color: 'red' }}>{t('action.delete', 'Delete')}</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer title={t('page.recurringPlans', 'Recurring Plans')}>
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
            message.error(
              err?.data?.message ||
                t('error.failedToLoadPlans', 'Failed to load plans'),
            );
            return { data: [], success: false };
          }
        }}
        toolbar={{
          title: t('page.recurringPlans', 'Recurring Plans'),
          actions: [
            <Button
              key="new"
              type="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              {t('action.newPlan', 'New Plan')}
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
            message.success(
              editing?.id
                ? t('message.updated', 'Updated')
                : t('message.created', 'Created'),
            );
            actionRef.current?.reload();
            return true;
          } catch (err: any) {
            message.error(
              err?.data?.message || t('error.saveFailed', 'Save failed'),
            );
            return false;
          }
        }}
      />
    </PageContainer>
  );
};

export default RecurringPlansPage;
