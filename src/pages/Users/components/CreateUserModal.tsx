import { listRoles, type Role } from '@/services/roles';
import { createUser, type RegistrationRequest } from '@/services/users';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await listRoles();
      setRoles(res.data || []);
    } catch (err: any) {
      message.error(err?.data?.message || 'Failed to load roles');
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
      title="Create User"
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnClose: true }}
      width={480}
      onFinish={async (values) => {
        try {
          await createUser(values);
          message.success('User created');
          onCreated();
          return true;
        } catch (err: any) {
          message.error(err?.data?.message || 'Create failed');
          return false;
        }
      }}
    >
      <ProFormText
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter name' }]}
        placeholder="Full name"
      />
      <ProFormText
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter email' },
          { type: 'email', message: 'Invalid email' },
        ]}
        placeholder="user@example.com"
      />
      <ProFormText.Password
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Please enter password' }]}
        placeholder="Password"
      />
      <ProFormSelect
        name="roles"
        label="Roles"
        mode="multiple"
        fieldProps={{ loading: loadingRoles }}
        options={roles.map((r) => ({ label: r.name, value: r.name }))}
        placeholder="Select roles"
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
