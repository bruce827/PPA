# 项目评估系统 - 前端

## 项目简介

这是一个基于 UMI Max 框架开发的项目评估系统前端应用，用于管理和评估软件项目的成本、风险和工作量。系统提供了完整的项目生命周期管理功能，包括项目创建、评估、历史记录查看、AI 辅助评估等。

## 技术栈

- **框架**: [Umi Max](https://umijs.org/docs/max/introduce) ^4.5.2
- **UI 组件库**: [Ant Design](https://ant.design/) ^5.28.0
- **图表库**: [@ant-design/charts](https://charts.ant.design/) ^2.6.5
- **高级组件**: [@ant-design/pro-components](https://procomponents.ant.design/) ^2.8.10
- **语言**: TypeScript ^5.0.3
- **代码格式化**: Prettier ^2.8.7 + Husky ^9 + lint-staged ^13.2.0

## 项目结构

```text
frontend/ppa_frontend/
├── src/
│   ├── access.ts                 # 权限控制配置
│   ├── app.tsx                   # 应用入口配置
│   ├── assets/                   # 静态资源
│   ├── components/               # 公共组件
│   ├── constants/                # 常量定义
│   ├── models/                   # 全局状态管理
│   │   └── global.ts             # 全局状态模型
│   ├── pages/                    # 页面组件
│   │   ├── Assessment/           # 项目评估相关页面
│   │   │   ├── New.tsx           # 新建评估
│   │   │   ├── Detail.tsx        # 评估详情
│   │   │   ├── History.tsx       # 评估历史
│   │   │   └── components/       # 评估相关组件
│   │   │       ├── AIAssessmentModal.tsx        # AI 评估弹窗
│   │   │       ├── RiskScoringForm.tsx          # 风险评分表单
│   │   │       ├── WorkloadEstimation.tsx       # 工作量估算
│   │   │       ├── ProjectModuleAnalyzer.tsx    # 项目模块分析器
│   │   │       └── Overview.tsx                 # 评估概览
│   │   ├── Dashboard.tsx         # 仪表板
│   │   ├── Config.tsx            # 系统配置
│   │   ├── Home/                 # 首页组件
│   │   ├── Table/                # 项目管理表格
│   │   └── ModelConfig/          # AI 模型配置
│   │       ├── Application/      # 应用管理
│   │       └── Prompts/          # 提示词管理
│   ├── services/                 # API 服务层
│   │   ├── assessment/           # 评估相关 API
│   │   ├── config/               # 配置相关 API
│   │   ├── dashboard/            # 仪表板 API
│   │   ├── aiModel/              # AI 模型 API
│   │   └── projects/             # 项目 API
│   └── utils/                    # 工具函数
│       ├── format.ts             # 格式化工具
│       └── rating.ts             # 评分工具
├── .umirc.ts                     # Umi 路由和配置
├── package.json                  # 依赖配置
├── tsconfig.json                 # TypeScript 配置
├── typings.d.ts                  # 类型定义
└── README.md                     # 本文档
```

## 主要功能

### 1. 项目管理

- 创建、编辑、删除项目
- 项目列表展示和筛选
- 项目状态管理

### 2. 项目评估

- 多维度项目评估（成本、风险、工作量）
- AI 辅助评估功能
- 评估历史记录
- 评估详情查看

### 3. AI 模型配置

- AI 模型管理（豆包、OpenAI 等）
- 提示词模板配置
- 变量管理
- 提示词预览

### 4. 系统配置

- 基础配置管理
- 权限控制
- 数据字典管理

### 5. 数据可视化

- 项目统计仪表板
- 评估结果图表展示
- 趋势分析

## 安装和运行

### 前置条件

- Node.js >= 16
- npm 或 yarn

### 安装依赖

```bash
cd frontend/ppa_frontend
npm install
# 或
yarn install
```

### 开发环境运行

```bash
npm run dev
# 或
yarn dev
```

应用将在 `http://localhost:8000` 启动。

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

构建产物将输出到 `dist/` 目录。

### 代码格式化

```bash
npm run format
# 或
yarn format
```

## 配置说明

### 代理配置

在 `.umirc.ts` 中配置了 API 代理，将 `/api` 前缀的请求代理到后端服务（默认 `http://localhost:3001`）：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

### 路由配置

主要路由：

- `/` → 重定向到 `/dashboard`
- `/dashboard` → 仪表板
- `/table` → 项目管理
- `/assessment/new` → 新建评估
- `/assessment/detail/:id` → 评估详情
- `/assessment/history` → 评估历史
- `/config` → 系统配置
- `/model-config/*` → AI 模型配置

## 开发规范

### 代码风格

- 使用 2 个空格缩进
- 使用单引号
- 使用 Prettier 进行代码格式化
- 提交前运行 `npm run format`

### 命名规范

- 组件文件：PascalCase（如 `Dashboard.tsx`）
- 普通文件：camelCase（如 `api.ts`）
- 变量和函数：camelCase
- 常量：UPPER_SNAKE_CASE

### 组件开发

- 页面组件放在 `src/pages/` 目录
- 公共组件放在 `src/components/` 目录
- 业务组件放在对应页面的 `components/` 子目录

## 与后端集成

前端通过 `/api` 前缀与后端服务通信，后端默认运行在 `http://localhost:3001`。确保后端服务已启动后再运行前端开发环境。

后端项目地址：`/server`

## 常见问题

### 1. 代理不生效

检查 `.umirc.ts` 中的代理配置是否正确，确保后端服务已启动。

### 2. TypeScript 类型错误

运行 `npm run format` 格式化代码，检查类型定义文件。

### 3. 依赖安装失败

尝试清除缓存后重新安装：

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 相关文档

- [Umi Max 官方文档](https://umijs.org/docs/max/introduce)
- [Ant Design 组件文档](https://ant.design/components/overview)
- [后端 README](../server/README.md)
- [项目总体文档](../../README.md)

## 贡献指南

1. 创建功能分支：`git checkout -b feature/your-feature-name`
2. 提交更改：`git commit -m 'feat: 添加新功能'`
3. 推送到分支：`git push origin feature/your-feature-name`
4. 创建 Pull Request

## 许可证

[MIT License](../../LICENSE)
