import type { CustomerDTO } from '@/services/customers';
import { useIntl } from '@umijs/max';
import { Descriptions, Drawer } from 'antd';
import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  customer?: CustomerDTO;
};

const CustomerDetailsDrawer: React.FC<Props> = ({
  open,
  onClose,
  customer,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  return (
    <Drawer
      width={480}
      open={open}
      onClose={onClose}
      title={
        customer
          ? `${t('label.customer', 'Customer')}: ${customer.name}`
          : t('modal.customerDetails', 'Customer Details')
      }
    >
      {customer && (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('label.name', 'Name')}>
            {customer.name}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.email', 'Email')}>
            {customer.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.phone', 'Phone')}>
            {customer.phone || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.city', 'City')}>
            {customer.city || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.country', 'Country')}>
            {customer.countryCode || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('label.paymentTermsDays', 'Payment Terms (days)')}
          >
            {customer.paymentTermsDays ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.vatId', 'VAT ID')}>
            {customer.vatId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.taxNumber', 'Tax Number')}>
            {customer.taxNumber || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.address', 'Address')}>
            {customer.street || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.postalCode', 'Postal Code')}>
            {customer.postalCode || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('label.notes', 'Notes')}>
            {(customer as any).notes || '-'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
};

export default CustomerDetailsDrawer;
