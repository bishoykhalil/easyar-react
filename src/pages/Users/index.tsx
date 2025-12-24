import { getAllUsers, uploadProfilePicture, UserDTO } from '@/services/users';
import { TeamOutlined, UploadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import type { UploadProps } from 'antd';
import { Avatar, Button, message, Space, Tag, Upload } from 'antd';
import React, { useEffect, useState } from 'react';
import CreateRoleModal from './components/CreateRoleModal';
import CreateUserModal from './components/CreateUserModal';
import UserRoleDrawer from './components/UserRoleDrawer';

const UsersPage: React.FC = () => {
  const [data, setData] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAllUsers();
      setData(res.data || []);
    } catch (err: any) {
      message.error(err?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns: ProColumns<UserDTO>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.roles?.length ? (
            record.roles.map((r) => <Tag key={r.id}>{r.name}</Tag>)
          ) : (
            <Tag>NONE</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Avatar',
      dataIndex: 'profilePictureUrl',
      render: (_, record) =>
        record.profilePictureUrl ? (
          <Avatar src={record.profilePictureUrl} />
        ) : (
          <Avatar>{record.name?.[0] || '?'}</Avatar>
        ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      render: (_, record) => {
        const uploadProps: UploadProps = {
          showUploadList: false,
          customRequest: async ({ file, onSuccess, onError }) => {
            try {
              const res = await uploadProfilePicture(file as File);
              message.success('Profile picture updated');
              onSuccess?.(res);
              fetchUsers();
            } catch (err: any) {
              message.error(err?.data?.message || 'Upload failed');
              onError?.(err);
            }
          },
        };
        return (
          <Space>
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={() => {
                setSelectedUserId(record.id);
                setRoleDrawerOpen(true);
              }}
            >
              Roles
            </Button>
            <Upload {...uploadProps}>
              <Button size="small" icon={<UploadOutlined />}>
                Avatar
              </Button>
            </Upload>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<UserDTO>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        search={false}
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={() => setCreateOpen(true)}>
            New User
          </Button>,
          <Button key="new-role" onClick={() => setCreateRoleOpen(true)}>
            New Role
          </Button>,
        ]}
        pagination={{
          pageSize: 10,
        }}
      />
      <UserRoleDrawer
        open={roleDrawerOpen}
        userId={selectedUserId}
        onClose={() => setRoleDrawerOpen(false)}
      />
      <CreateUserModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          fetchUsers();
        }}
      />
      <CreateRoleModal open={createRoleOpen} onOpenChange={setCreateRoleOpen} />
    </PageContainer>
  );
};

export default UsersPage;
