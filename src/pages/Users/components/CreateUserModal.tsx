import { listRoles, type Role } from '@/services/roles';
import { createUser, type RegistrationRequest } from '@/services/users';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { message, Spin } from 'antd';
import React, { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

const CreateUserModal: React.FC<Props> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await listRoles();
      setRoles(res.data || []);
    } catch (err: any) {
      message.error(
        err?.data?.message ||
          t('message.failedToLoadRoles', 'Failed to load roles'),
      );
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open]);

  return (
    <ModalForm<RegistrationRequest>
      title={t('modal.userCreate', 'Create User')}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnClose: true }}
      width={480}
      onFinish={async (values) => {
        try {
          await createUser(values);
          message.success(t('message.userCreated', 'User created'));
          onCreated();
          return true;
        } catch (err: any) {
          message.error(
            err?.data?.message || t('message.createFailed', 'Create failed'),
          );
          return false;
        }
      }}
    >
      <ProFormText
        name="name"
        label={t('label.name', 'Name')}
        rules={[
          {
            required: true,
            message: t('message.nameRequired', 'Please enter name'),
          },
        ]}
        placeholder={t('placeholder.fullName', 'Full name')}
      />
      <ProFormText
        name="email"
        label={t('label.email', 'Email')}
        rules={[
          {
            required: true,
            message: t('message.emailRequired', 'Please enter email'),
          },
          {
            type: 'email',
            message: t('message.emailInvalid', 'Invalid email'),
          },
        ]}
        placeholder={t('placeholder.email', 'user@example.com')}
      />
      <ProFormText.Password
        name="password"
        label={t('label.password', 'Password')}
        rules={[
          {
            required: true,
            message: t('message.passwordRequired', 'Please enter password'),
          },
        ]}
        placeholder={t('placeholder.password', 'Password')}
      />
      <ProFormSelect
        name="roles"
        label={t('label.roles', 'Roles')}
        mode="multiple"
        fieldProps={{ loading: loadingRoles }}
        options={roles.map((r) => ({ label: r.name, value: r.name }))}
        placeholder={t('placeholder.roles', 'Select roles')}
      />
      {loadingRoles && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Spin size="small" />
        </div>
      )}
    </ModalForm>
  );
};

export default CreateUserModal;
