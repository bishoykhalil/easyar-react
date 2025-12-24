import { createRole, type Role } from '@/services/roles';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
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
  return (
    <ModalForm<Role>
      title="Create Role"
      width={400}
      open={open}
      onOpenChange={onOpenChange}
      modalProps={{ destroyOnClose: true }}
      onFinish={async (values) => {
        try {
          const res = await createRole(values);
          message.success('Role created');
          onCreated?.(res.data);
          return true;
        } catch (err: any) {
          message.error(err?.data?.message || 'Create role failed');
          return false;
        }
      }}
    >
      <ProFormText
        name="name"
        label="Role Name"
        rules={[{ required: true, message: 'Please enter a role name' }]}
        placeholder="e.g. ADMIN"
      />
    </ModalForm>
  );
};

export default CreateRoleModal;
