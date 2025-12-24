import { login } from '@/services/auth';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { message } from 'antd';
import React, { useState } from 'react';

const TOKEN_KEY = 'easyar_token';
const ROLES_KEY = 'easyar_roles';
const PERMS_KEY = 'easyar_perms';

const Login: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const { setInitialState } = useModel('@@initialState');

  const handleSubmit = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    try {
      const res = await login(values);
      const token = res?.data?.token;
      const roles = res?.data?.roles || [];
      const permissions = res?.data?.permissions || [];

      if (!token) {
        message.error(res?.message || 'Login failed');
        return;
      }

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
      localStorage.setItem(PERMS_KEY, JSON.stringify(permissions));

      await setInitialState((s: any) => ({
        ...s,
        token,
        roles,
        permissions,
      }));

      message.success('Login successful');
      history.push('/');
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'Login failed, please check your email and password';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 20% 20%, #e6f4ff, #f9fbff 40%), radial-gradient(circle at 80% 0%, #f0f5ff, #ffffff 50%)',
      }}
    >
      <LoginForm
        logo="https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg"
        title="EasyAR Admin"
        subTitle="Sign in to manage customers, orders, invoices, and settings"
        onFinish={handleSubmit}
        submitter={{
          searchConfig: {
            submitText: 'Login',
          },
          submitButtonProps: {
            loading: submitting,
            block: true,
            size: 'large',
          },
        }}
      >
        <ProFormText
          name="email"
          fieldProps={{
            size: 'large',
            prefix: <UserOutlined />,
          }}
          placeholder="Email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        />
        <ProFormText.Password
          name="password"
          fieldProps={{
            size: 'large',
            prefix: <LockOutlined />,
          }}
          placeholder="Password"
          rules={[{ required: true, message: 'Please enter your password' }]}
        />
      </LoginForm>
    </div>
  );
};

export default Login;
