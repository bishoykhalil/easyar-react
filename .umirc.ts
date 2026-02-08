import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  locale: {
    default: 'en-US',
    baseNavigator: true,
    antd: true,
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  proxy: {
    '/api': {
      target: 'http://localhost:8086',
      changeOrigin: true,
    },
  },
  layout: {
    title: 'EasyAR Admin',
  },
  routes: [
    {
      path: '/user/login',
      component: './User/Login',
      layout: false,
    },
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/core',
      redirect: '/home',
    },
    {
      path: '/core/home',
      redirect: '/home',
    },
    {
      name: 'Home',
      path: '/home',
      component: './Home',
      access: 'isAuthenticated',
    },
    {
      name: 'Dashboards',
      path: '/dashboards',
      routes: [
        {
          path: '/dashboards',
          redirect: '/dashboards/finance',
        },
        {
          name: 'Finance Overview',
          path: '/dashboards/finance',
          component: './Dashboards/Finance',
          access: 'canSeeAdmin',
        },
        {
          name: 'Recurring Ops',
          path: '/dashboards/recurring',
          component: './Dashboards/Recurring',
          access: 'canSeeAdmin',
        },
        {
          name: 'Customer Health',
          path: '/dashboards/customers',
          component: './Dashboards/Customers',
          access: 'canSeeAdmin',
        },
        {
          name: 'Worklist',
          path: '/dashboards/worklist',
          component: './Dashboards/Worklist',
          access: 'canSeeAdmin',
        },
      ],
    },
    {
      name: 'Management',
      path: '/management',
      routes: [
        {
          path: '/management',
          redirect: '/management/users',
        },
        {
          name: 'Users',
          path: '/management/users',
          component: './Users',
          access: 'canSeeAdmin',
        },
        {
          name: 'Settings',
          path: '/management/settings',
          component: './Settings',
          access: 'canSeeAdmin',
        },
      ],
    },
    {
      name: 'Billing',
      path: '/billing',
      routes: [
        {
          path: '/billing',
          redirect: '/billing/customers',
        },
        {
          name: 'Customers',
          path: '/billing/customers',
          component: './Customers',
          access: 'canSeeAdmin',
        },
        {
          name: 'Price List',
          path: '/billing/pricelist',
          component: './PriceList',
          access: 'canSeeAdmin',
        },
        {
          name: 'Orders',
          path: '/billing/orders',
          component: './Orders',
          access: 'canSeeAdmin',
        },
        {
          name: 'Invoices',
          path: '/billing/invoices',
          component: './Invoices',
          access: 'canSeeAdmin',
        },
        {
          name: 'Recurring Plans',
          path: '/billing/recurring-plans',
          component: './RecurringPlans',
          access: 'canSeeAdmin',
        },
      ],
    },
    {
      path: '/*',
      redirect: '/home',
    },
  ],
  npmClient: 'npm',
});
