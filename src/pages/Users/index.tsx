import { getAllUsers, uploadProfilePicture, UserDTO } from '@/services/users';
import { TeamOutlined, UploadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type { UploadProps } from 'antd';
import { Avatar, Button, message, Space, Tag, Upload } from 'antd';
import React, { useEffect, useState } from 'react';
import CreateRoleModal from './components/CreateRoleModal';
import CreateUserModal from './components/CreateUserModal';
import UserRoleDrawer from './components/UserRoleDrawer';

const UsersPage: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });
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
      message.error(
        err?.data?.message ||
          t('message.failedToLoadUsers', 'Failed to load users'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns: ProColumns<UserDTO>[] = [
    {
      title: t('table.id', 'ID'),
      dataIndex: 'id',
      width: 60,
    },
    {
      title: t('table.name', 'Name'),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: t('table.email', 'Email'),
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: t('table.roles', 'Roles'),
      dataIndex: 'roles',
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.roles?.length ? (
            record.roles.map((r) => <Tag key={r.id}>{r.name}</Tag>)
          ) : (
            <Tag>{t('status.none', 'NONE')}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('table.avatar', 'Avatar'),
      dataIndex: 'profilePictureUrl',
      render: (_, record) =>
        record.profilePictureUrl ? (
          <Avatar src={record.profilePictureUrl} />
        ) : (
          <Avatar>{record.name?.[0] || '?'}</Avatar>
        ),
    },
    {
      title: t('table.actions', 'Actions'),
      valueType: 'option',
      render: (_, record) => {
        const uploadProps: UploadProps = {
          showUploadList: false,
          customRequest: async ({ file, onSuccess, onError }) => {
            try {
              const res = await uploadProfilePicture(file as File);
              message.success(
                t('message.profileUpdated', 'Profile picture updated'),
              );
              onSuccess?.(res);
              fetchUsers();
            } catch (err: any) {
              message.error(
                err?.data?.message ||
                  t('message.uploadFailed', 'Upload failed'),
              );
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
              {t('label.roles', 'Roles')}
            </Button>
            <Upload {...uploadProps}>
              <Button size="small" icon={<UploadOutlined />}>
                {t('table.avatar', 'Avatar')}
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
            {t('action.newUser', 'New User')}
          </Button>,
          <Button key="new-role" onClick={() => setCreateRoleOpen(true)}>
            {t('action.newRole', 'New Role')}
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
