import type { Role } from '@/services/roles';
import {
  assignRole,
  getUserRoles,
  listRoles,
  removeRole,
} from '@/services/roles';
import { Checkbox, Drawer, List, message, Space, Spin, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  open: boolean;
  userId?: number;
  onClose: () => void;
};

const UserRoleDrawer: React.FC<Props> = ({ open, userId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleNames, setUserRoleNames] = useState<string[]>([]);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [rolesRes, userRolesRes] = await Promise.all([
        listRoles(),
        getUserRoles(userId),
      ]);
      setRoles(rolesRes.data || []);
      setUserRoleNames(userRolesRes.data || []);
    } catch (err: any) {
      message.error(err?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const roleChecked = useMemo(() => new Set(userRoleNames), [userRoleNames]);

  const handleToggle = async (role: Role, checked: boolean) => {
    if (!userId || !role.id) return;
    setSaving(true);
    try {
      if (checked) {
        await assignRole(userId, role.id);
        setUserRoleNames((prev) => Array.from(new Set([...prev, role.name])));
      } else {
        await removeRole(userId, role.id);
        setUserRoleNames((prev) => prev.filter((r) => r !== role.name));
      }
    } catch (err: any) {
      message.error(err?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="Manage Roles"
      open={open}
      width={360}
      onClose={onClose}
      destroyOnClose
      extra={
        <Typography.Text type="secondary">
          {saving ? 'Saving...' : null}
        </Typography.Text>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <List
          dataSource={roles}
          renderItem={(role) => (
            <List.Item>
              <Space>
                <Checkbox
                  checked={roleChecked.has(role.name)}
                  onChange={(e) => handleToggle(role, e.target.checked)}
                  disabled={saving}
                />
                <Typography.Text>{role.name}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default UserRoleDrawer;
