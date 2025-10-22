# Sprint 10 - 接口请求重构为 Request 方案

## 问题描述

除新项目评估模块外，其他模块（配置管理、历史项目、项目详情、仪表盘）仍在使用原生 `fetch` 进行接口请求，不符合 Ant Design Pro 最佳实践，且缺乏统一的错误处理和请求拦截机制。

## 影响范围

- **配置管理页面** (`Config.tsx`)
- **历史项目列表** (`Assessment/History.tsx`)
- **项目详情页面** (`Assessment/Detail.tsx`)
- **仪表盘页面** (`Dashboard.tsx`)

## 解决方案

### 1. 创建 Services 层

按照 Ant Design Pro 规范，在 `src/services/` 目录下创建统一的 API 服务层。

#### 1.1 配置管理服务 (`services/config/`)

**文件结构:**
```
services/config/
├── index.ts       # API 方法实现
└── typings.d.ts   # 类型定义
```

**类型定义 (`typings.d.ts`):**
```typescript
declare namespace API {
  // 角色配置
  type RoleConfig = {
    id: number;
    role_name: string;
    unit_price: number;
    created_at?: string;
    updated_at?: string;
  };

  // 风险项配置
  type RiskItemConfig = {
    id: number;
    item_name: string;
    item_description?: string;
    max_score: number;
    created_at?: string;
    updated_at?: string;
  };

  // 差旅成本配置
  type TravelCostConfig = {
    id: number;
    destination: string;
    transport_cost?: number;
    accommodation_cost?: number;
    daily_allowance?: number;
    created_at?: string;
    updated_at?: string;
  };
}
```

**API 方法 (`index.ts`):**
```typescript
import { request } from '@umijs/max';

// 角色配置 CRUD
export async function getRoleList(options?: { [key: string]: any })
export async function createRole(data: API.RoleParams, options?: { [key: string]: any })
export async function updateRole(id: number, data: API.RoleParams, options?: { [key: string]: any })
export async function deleteRole(id: number, options?: { [key: string]: any })

// 风险项配置 CRUD
export async function getRiskItemList(options?: { [key: string]: any })
export async function createRiskItem(data: API.RiskItemParams, options?: { [key: string]: any })
export async function updateRiskItem(id: number, data: API.RiskItemParams, options?: { [key: string]: any })
export async function deleteRiskItem(id: number, options?: { [key: string]: any })

// 差旅成本配置 CRUD
export async function getTravelCostList(options?: { [key: string]: any })
export async function createTravelCost(data: API.TravelCostParams, options?: { [key: string]: any })
export async function updateTravelCost(id: number, data: API.TravelCostParams, options?: { [key: string]: any })
export async function deleteTravelCost(id: number, options?: { [key: string]: any })
```

#### 1.2 项目管理服务 (`services/projects/`)

**类型定义 (`typings.d.ts`):**
```typescript
declare namespace API {
  type ProjectInfo = {
    id: number;
    name: string;
    description?: string;
    final_total_cost: number;
    final_risk_score: number;
    final_workload_days?: number;
    created_at?: string;
    updated_at?: string;
    project_data?: any;
  };
}
```

**API 方法 (`index.ts`):**
```typescript
import { request } from '@umijs/max';

export async function getProjectList(options?: { [key: string]: any })
export async function getProjectDetail(id: string | number, options?: { [key: string]: any })
export async function deleteProject(id: string | number, options?: { [key: string]: any })
export function exportProjectToPDF(id: string | number): string
export function exportProjectToExcel(id: string | number): string
```

#### 1.3 仪表盘服务 (`services/dashboard/`)

**API 方法 (`index.ts`):**
```typescript
import { request } from '@umijs/max';

export async function getDashboardData(options?: { [key: string]: any })
```

### 2. 页面组件重构

#### 2.1 Config.tsx - 配置管理页面

**修改前:**
```typescript
// 使用原生 fetch
await fetch('/api/config/roles');
await fetch('/api/config/roles', { method: 'POST', ... });
await fetch(`/api/config/roles/${id}`, { method: 'PUT', ... });
await fetch(`/api/config/roles/${id}`, { method: 'DELETE' });
```

**修改后:**
```typescript
// 导入 services
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getRiskItemList,
  createRiskItem,
  updateRiskItem,
  deleteRiskItem,
  getTravelCostList,
  createTravelCost,
  updateTravelCost,
  deleteTravelCost,
} from '@/services/config';

// 使用 request 方案
const res = await getRoleList();
await createRole({ role_name: '...', unit_price: 100 });
await updateRole(id, { role_name: '...', unit_price: 100 });
await deleteRole(id);
```

**关键改动点:**
1. 角色管理模块：6处 fetch 替换为 services 方法
2. 风险项管理模块：4处 fetch 替换为 services 方法
3. 差旅成本管理模块：4处 fetch 替换为 services 方法

#### 2.2 Assessment/History.tsx - 历史项目列表

**修改前:**
```typescript
const res = await fetch('/api/projects');
const data = await res.json();
await fetch(`/api/projects/${record.id}`, { method: 'DELETE' });
```

**修改后:**
```typescript
import { getProjectList, deleteProject } from '@/services/projects';

const res = await getProjectList();
await deleteProject(record.id);
```

#### 2.3 Assessment/Detail.tsx - 项目详情

**修改前:**
```typescript
fetch(`/api/projects/${params.id}`)
  .then(res => res.json())
  .then(body => setProject(body.data));

window.open(`/api/projects/${params.id}/export/${type}`);
```

**修改后:**
```typescript
import { getProjectDetail, exportProjectToPDF, exportProjectToExcel } from '@/services/projects';

getProjectDetail(params.id)
  .then(res => setProject(res.data));

const url = type === 'pdf' 
  ? exportProjectToPDF(params.id) 
  : exportProjectToExcel(params.id);
window.open(url);
```

#### 2.4 Dashboard.tsx - 仪表盘

**修改前:**
```typescript
fetch('/api/projects')
  .then(res => res.json())
  .then(body => setProjects(body.data || []));
```

**修改后:**
```typescript
import { getDashboardData } from '@/services/dashboard';

getDashboardData()
  .then(res => setProjects(res.data || []));
```

## 技术要点

### 1. Request 方案的优势

- ✅ **统一错误处理**: 通过 `app.tsx` 中的 `errorConfig` 统一处理错误
- ✅ **请求拦截器**: 可以统一添加 token、日志等
- ✅ **响应拦截器**: 统一处理响应格式
- ✅ **类型安全**: TypeScript 类型提示完整
- ✅ **代码复用**: API 方法可在多处复用
- ✅ **易于测试**: services 层独立，便于单元测试

### 2. 类型定义规范

所有 API 相关类型定义都放在 `typings.d.ts` 中的 `API` 命名空间下：

```typescript
declare namespace API {
  // 请求参数类型
  type RoleParams = {
    role_name: string;
    unit_price: number;
  };

  // 响应数据类型
  type RoleConfig = {
    id: number;
    role_name: string;
    unit_price: number;
  };

  // 列表响应类型
  type RoleListResponse = {
    data: RoleConfig[];
    success: boolean;
  };
}
```

### 3. API 方法命名规范

遵循 RESTful 风格：
- `get*` - 获取数据（GET）
- `create*` - 创建数据（POST）
- `update*` - 更新数据（PUT）
- `delete*` - 删除数据（DELETE）
- `export*` - 导出功能（返回 URL）

### 4. 错误处理

Request 会自动使用 `app.tsx` 中配置的错误处理：

```typescript
// app.tsx
export const request = {
  errorConfig: {
    errorHandler: (error: any) => {
      const { response } = error;
      if (response && response.status) {
        message.error('请求失败');
      }
    },
  },
  requestInterceptors: [
    (config: RequestConfig) => {
      // 可以在这里添加 token 等
      return config;
    },
  ],
};
```

## 测试验证

### 1. 编译检查

```bash
cd frontend/ppa_frontend
npm run build
```

**结果**: ✅ 所有 TypeScript/JavaScript 文件无编译错误

### 2. 功能测试清单

#### 配置管理模块
- [ ] 角色配置：查询列表
- [ ] 角色配置：新建角色
- [ ] 角色配置：编辑角色
- [ ] 角色配置：删除角色
- [ ] 风险项配置：查询列表
- [ ] 风险项配置：新建风险项
- [ ] 风险项配置：编辑风险项
- [ ] 风险项配置：删除风险项
- [ ] 差旅成本配置：查询列表
- [ ] 差旅成本配置：新建成本项
- [ ] 差旅成本配置：编辑成本项
- [ ] 差旅成本配置：删除成本项

#### 项目管理模块
- [ ] 历史项目：查询项目列表
- [ ] 历史项目：删除项目
- [ ] 项目详情：查看项目详情
- [ ] 项目详情：导出为 PDF
- [ ] 项目详情：导出为 Excel

#### 仪表盘模块
- [ ] 仪表盘：显示项目总数
- [ ] 仪表盘：显示平均成本
- [ ] 仪表盘：显示风险分布图表

## 注意事项

### 1. 与新项目评估模块保持一致

新项目评估模块 (`Assessment/New.tsx`) 已经使用了 request 方案：
```typescript
import { getConfigAll, calculateProjectCost, createProject } from '@/services/assessment';
```

现在所有模块都统一使用 request 方案。

### 2. 导出功能的特殊处理

导出功能不需要等待响应，直接返回 URL 字符串：

```typescript
export function exportProjectToPDF(id: string | number) {
  return `/api/projects/${id}/export/pdf`;
}
```

### 3. ProTable 的 request 属性

ProTable 组件的 request 属性期望返回特定格式：

```typescript
request={async (params) => {
  const res = await getProjectList();
  return {
    data: res.data,
    success: true,
  };
}}
```

### 4. 临时 ID 的处理

在可编辑表格中，新建记录使用 `Date.now()` 作为临时 ID：

```typescript
onClick={() => {
  actionRef.current?.addEditRecord?.({
    id: Date.now(), // 临时唯一key
    role_name: '',
    unit_price: 0,
  });
}}
```

后端通过判断 `id < 1000000000000` 来区分是更新还是新建。

## 相关文件

### 新增文件
- `frontend/ppa_frontend/src/services/config/index.ts`
- `frontend/ppa_frontend/src/services/config/typings.d.ts`
- `frontend/ppa_frontend/src/services/projects/index.ts`
- `frontend/ppa_frontend/src/services/projects/typings.d.ts`
- `frontend/ppa_frontend/src/services/dashboard/index.ts`
- `frontend/ppa_frontend/src/services/dashboard/typings.d.ts`

### 修改文件
- `frontend/ppa_frontend/src/pages/Config.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/History.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/Detail.tsx`
- `frontend/ppa_frontend/src/pages/Dashboard.tsx`

## 后续优化建议

1. **添加 Loading 状态**: 使用 `useRequest` hook 自动管理 loading 状态
2. **添加错误重试**: 配置请求失败自动重试机制
3. **添加请求缓存**: 对于不常变化的数据（如配置项）可以添加缓存
4. **统一响应格式**: 确保后端所有接口返回格式一致
5. **添加请求日志**: 在开发环境记录所有请求日志便于调试

## 总结

本次重构将除新项目评估模块外的所有模块的接口请求方式统一为 `@umijs/max` 的 request 方案，提升了代码的规范性、可维护性和类型安全性。重构后的代码结构更清晰，符合 Ant Design Pro 最佳实践。

**重构统计:**
- 创建 Services 文件: 6 个
- 修改页面组件: 4 个
- 替换 fetch 调用: 约 16 处
- 新增类型定义: 12+ 个
- 编译错误: 0 个
