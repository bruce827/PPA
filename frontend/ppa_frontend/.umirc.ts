import { defineConfig } from '@umijs/max';
import pkg from './package.json';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '项目评估系统',
  },
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      name: '数据看板',
      path: '/dashboard',
      component: './Dashboard',
      icon: 'DashboardOutlined',
    },
    {
      name: '项目评估',
      path: '/assessment',
      icon: 'FormOutlined',
      routes: [
        {
          name: '新建评估',
          path: 'new',
          component: './Assessment/New',
        },
        {
          name: '历史项目',
          path: 'history',
          component: './Assessment/History',
        },
        {
          name: '业绩库(CSV)',
          path: 'contracts',
          component: './Assessment/Contracts',
        },
        {
          name: '项目详情',
          path: 'detail/:id',
          component: './Assessment/Detail',
          hideInMenu: true,
        },
      ],
    },
    {
      name: 'Web3D项目评估',
      path: '/web3d',
      icon: 'BoxPlotOutlined',
      routes: [
        { name: '新建评估', path: 'new', component: './Web3D/New' },
        { name: '历史项目', path: 'history', component: './Web3D/History' },
        { name: '项目详情', path: 'detail/:id', component: './Web3D/Detail', hideInMenu: true },
      ],
    },
    {
      name: 'Web3D风险配置',
      path: '/config/web3d-risk',
      component: './Config/Web3DRisk',
      hideInMenu: true,
    },
    {
      name: '参数配置',
      path: '/config',
      component: './Config',
      icon: 'SettingOutlined',
    },
    {
      name: '模型配置',
      path: '/model-config',
      icon: 'RobotOutlined',
      routes: [
        {
          name: '模型应用管理',
          path: 'application',
          component: './ModelConfig/Application',
        },
        {
          name: '提示词模板管理',
          path: 'prompts',
          component: './ModelConfig/Prompts',
        },
        {
          name: '新建提示词模板',
          path: 'prompts/create',
          component: './ModelConfig/Prompts/Form',
          hideInMenu: true,
        },
        {
          name: '编辑提示词模板',
          path: 'prompts/:id/edit',
          component: './ModelConfig/Prompts/Form',
          hideInMenu: true,
        },
      ],
    },
    {
      name: '系统监控',
      path: '/monitoring',
      routes: [
        {
          name: 'AI日志监控',
          path: 'ai-logs',
          component: './Monitoring/AiLogs',
        },
        {
          name: '日志详情',
          path: 'ai-logs/:requestHash',
          component: './Monitoring/AiLogDetail',
          hideInMenu: true,
        },
      ],
    },
  ],
  npmClient: 'yarn',
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      ws: true,
    },
  },
  // 禁用严格模式和 MFSU 以避免 findDOMNode 警告
  mfsu: false,
  // reactStrictMode: false,
  // 平台版本
  define: {
    "app_version": pkg.version,
  }
});
