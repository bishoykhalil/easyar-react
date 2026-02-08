import { createRole, type Role } from '@/services/roles';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { message } from 'antd';
import React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (role: Role) => void;
};

const CreateRoleModal: React.FC<Props> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  return (
    <ModalForm<Role>
      title={t('modal.roleCreate', 'Create Role')}
      width={400}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnClose: true }}
      onFinish={async (values) => {
        try {
          const res = await createRole(values);
          message.success(t('message.roleCreated', 'Role created'));
          onCreated?.(res.data);
          return true;
        } catch (err: any) {
          message.error(
            err?.data?.message ||
              t('message.failedToCreateRole', 'Create role failed'),
          );
          return false;
        }
      }}
    >
      <ProFormText
        name="name"
        label={t('label.roleName', 'Role Name')}
        rules={[
          {
            required: true,
            message: t('message.roleNameRequired', 'Please enter a role name'),
          },
        ]}
        placeholder={t('placeholder.roleExample', 'e.g. ADMIN')}
      />
    </ModalForm>
  );
};

export default CreateRoleModal;
