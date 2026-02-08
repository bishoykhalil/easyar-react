import { listOrdersPaged, type OrderResponseDTO } from '@/services/orders';
import { ModalForm, ProFormSelect } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onFinish: (values: { orderId: number }) => Promise<boolean>;
};

const CreateInvoiceForm: React.FC<Props> = ({
  open,
  onOpenChange,
  onFinish,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  return (
    <ModalForm<{ orderId: number }>
      title={t('modal.createInvoiceFromOrder', 'Create Invoice from Order')}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnClose: true }}
      onFinish={onFinish}
      layout="vertical"
    >
      <ProFormSelect
        name="orderId"
        label={t('label.order', 'Order')}
        rules={[
          {
            required: true,
            message: t('message.selectOrder', 'Please select order'),
          },
        ]}
        showSearch
        debounceTime={300}
        request={async ({ keyWords }) => {
          try {
            const res = await listOrdersPaged({
              q: keyWords && keyWords.length > 0 ? keyWords : '%',
              page: 0,
              size: 10,
              sort: 'createdAt,desc',
            });
            return (
              res.data?.content?.map((o: OrderResponseDTO) => ({
                label: `${o.orderNumber || o.id} - ${o.customerName}`,
                value: o.id,
              })) || []
            );
          } catch {
            return [];
          }
        }}
      />
    </ModalForm>
  );
};

export default CreateInvoiceForm;
