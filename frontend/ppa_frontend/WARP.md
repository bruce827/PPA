# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 项目概述

这是一个基于 UmiJS Max 构建的项目评估系统前端应用，主要功能包括项目风险评估、成本预算、工作量估算、AI 模型管理等。使用 React + TypeScript + Ant Design Pro Components 技术栈。

## 核心开发命令

### 开发环境

```bash
# 启动开发服务器（推荐，支持热更新）
yarn dev

# 替代命令
yarn start
npm run dev
```

### 构建部署

```bash
# 构建生产版本
yarn build

# 项目初始化设置（安装依赖后自动运行）
yarn setup
```

### 代码质量

```bash
# 格式化代码（自动修复格式问题）
yarn format

# Husky Git 钩子会在提交时自动运行以下命令：
# - npx lint-staged --quiet  (pre-commit)
# - npx max verify-commit     (commit-msg)
```

### 依赖管理

```bash
# 安装依赖（必须使用 yarn）
yarn install

# 不要使用 npm install，项目配置为使用 yarn
```

## 项目架构

### 技术栈

- **框架**: UmiJS Max (v4.5.2)
- **UI 组件库**: Ant Design v5 + ProComponents
- **数据可视化**: @ant-design/charts (基于 G2)
- **语言**: TypeScript
- **包管理器**: Yarn (v1.22.17)
- **代码格式化**: Prettier + ESLint (UmiJS Max 默认配置)

### 目录结构

```
src/
├── .umi/                    # Umi 自动生成文件（勿修改）
├── .umi-production/         # 生产构建自动生成文件
├── access.ts               # 权限控制配置
├── app.ts                 # 运行时配置（初始化状态、layout）
├── assets/                # 静态资源
├── components/            # 通用组件
├── constants/             # 常量定义
├── models/                # 全局 Hooks 模型
├── pages/                 # 页面组件
│   ├── Assessment/         # ❤ 核心：项目评估模块
│   │   ├── New.tsx          # 4步骤评估流程（风险/工作量/成本/总览）
│   │   ├── Detail.tsx       # 项目详情、评估结果展示
│   │   ├── History.tsx      # 历史项目列表
│   │   └── components/     # 详细流程组件（4个子组件）
│   ├── Dashboard.tsx        # 数据看板（风险分布饼图等）
│   ├── Config.tsx           # 参数配置页面
│   ├── ModelConfig/        # ❤ 新增：AI 模型配置
│   │   ├── Application/    # 模型应用管理
│   │   └── Prompts/        # 提示词模板管理
│   └── Table/              # 样例页面（可删除）
├── services/              # API 服务层
│   ├── assessment.ts     # 项目评估 API
│   ├── dashboard.ts       # 数据看板 API
│   ├── config.ts          # 配置信息 API
│   ├── aiModel.ts         # AI 模型 API
│   ├── promptTemplate.ts  # 提示词模板 API
│   └── projects.ts        # 项目列表 API
├── utils/                 # 工具函数
│   ├── format.ts          # 格式化函数
│   └── rating.ts          # 风险评分计算器
└── typings.d.ts           # TypeScript 类型定义
```

### 核心数据流与业务逻辑

#### 1. 项目评估流程 (Assessment/New.tsx)

采用四步向导式流程，每步对应一个组件：

**第一步：风险评分** (RiskScoringForm)

- 从 `getConfigAll()` API 获取风险项配置
- 对每个风险项打分
- 使用 `utils/rating.ts` 的 `summarizeRisk()` 计算风险总分、因子、占比
- 使用 `deduceRiskLevel()` 判断风险等级（低/中/高）

**第二步：工作量估算** (WorkloadEstimation)

- 添加开发工作量（功能模块）
- 添加系统对接工作量（集成任务）

**第三步：其他成本** (OtherCostsForm)

- 差旅费：月份 × 人数 × 8000 × 评分因子
- 运维费：月份 × 20 × 人数 × 日成本 × 评分因子
- 风险成本：风险项成本 × 10000 × 评分因子

**第四步：总览生成** (Overview)

- 显示最终报价计算结果
- 各项成本汇总展示

#### 2. 数据管理

- **初始化**：`getConfigAll()` 获取全局配置
- **状态**：React State 管理 `AssessmentData`
- **提交**：`createAssessment()` 提交到后端
- **检索**：`getProjectDetail()` 获取项目数据用于模板导入

#### 3. 关键工具函数 (utils/rating.ts)

- `summarizeRisk()`：计算风险总分、评分因子、风险占比
- `deduceRiskLevel()`：根据风险占比返回等级
- 评分因子分段线性映射：≤70% 系数 1.0，>120% 封顶 1.5

### 路由配置

路由在 `.umirc.ts` 中集中配置：

- `/dashboard` - 数据看板（默认首页）
- `/assessment/new` - 新建项目评估
- `/assessment/history` - 历史项目列表
- `/assessment/detail/:id` - 项目详情
- `/config` - 参数配置
- `/model-config/application` - 模型应用管理
- `/model-config/prompts` - 提示词模板列表
- `/model-config/prompts/create` - 新建提示词模板
- `/model-config/prompts/:id/edit` - 编辑提示词模板

### API 代理配置

开发环境：所有 `/api` 请求代理到 `http://localhost:3001`

### Mock 数据

Mock 数据在 `mock/` 目录，开发时自动加载

## 关键配置文件

- `.umirc.ts` - UmiJS 核心配置（路由、插件、代理、layout）
- `tsconfig.json` - TypeScript 配置（扩展 `.umi/tsconfig.json`）
- `.prettierrc` - 代码格式化规则
  - 行宽：80 字符
  - 单引号、trailing comma
  - 启用 organize-imports 和 packagejson 插件
- `.eslintrc.js` - ESLint 规则（继承 UmiJS Max）
- `.husky/` - Git 钩子（pre-commit、commit-msg）

## 开发规范

### 代码风格

- 单引号、行宽 80、trailing comma
- 自动组织 imports
- TypeScript：优先使用类型注解，避免 any

### 页面开发

- 所有页面放在 `src/pages/`
- 使用 `PageContainer` (ProComponents)
- 使用 Ant Design v5 组件库

### 服务层开发

- API 服务在 `src/services/`，按业务模块分类
- 使用 `request` 函数（@umijs/max）
- 定义接口类型
- 遵循 RESTful 约定

### 状态管理

- 简单状态：`useState`
- 全局状态：`src/models/` 中定义 hooks

## 权限系统

权限通过 `src/access.ts` 管理，基于 `initialState` 中的用户信息。

## 特别注意

1. **勿修改自动生成目录**：`.umi/` 和 `.umi-production/`
2. **包管理器**：使用 yarn，避免 npm install
3. **TypeScript**：全量使用，新增页面需类型注解
4. **评分逻辑**：核心在 `utils/rating.ts`，修改需谨慎测试
5. **表单数据**：Assessment/New.tsx 使用 `AssessmentData` 类型管理流程数据
6. **Umi Max 插件**：启用了 access、model、initialState、request、layout、antd
