import type { CustomerDTO } from '@/services/customers';
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
  return (
    <Drawer
      width={480}
      open={open}
      onClose={onClose}
      title={customer ? `Customer: ${customer.name}` : 'Customer Details'}
    >
      {customer && (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Name">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="Email">
            {customer.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Phone">
            {customer.phone || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="City">
            {customer.city || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Country">
            {customer.countryCode || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Payment Terms (days)">
            {customer.paymentTermsDays ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="VAT ID">
            {customer.vatId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Tax Number">
            {customer.taxNumber || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Address">
            {customer.street || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Postal Code">
            {customer.postalCode || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Notes">
            {(customer as any).notes || '-'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
};

export default CustomerDetailsDrawer;
