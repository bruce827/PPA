# Sprint 8 - 网络请求重构为 Services

**日期**: 2025-10-21  
**文件**: `frontend/ppa_frontend/src/pages/Assessment/New.tsx`

## 问题描述

原代码直接在组件中使用原生 `fetch` 进行网络请求，不符合 Ant Design Pro 的最佳实践。需要：
1. 将所有网络请求封装到 services 层
2. 使用 `@umijs/max` 的 `request` 方法替代原生 fetch
3. 统一类型定义，使用 TypeScript 类型安全

## 解决方案

### 1. 创建 Services 层

**文件**: `frontend/ppa_frontend/src/services/assessment/index.ts`

封装了四个 API 方法：
- `getConfigAll()` - 获取所有配置数据（角色+风险项）
- `getProjectDetail(projectId)` - 获取项目详情
- `calculateProjectCost(data)` - 计算项目报价
- `createProject(data)` - 创建项目

### 2. 创建类型定义

**文件**: `frontend/ppa_frontend/src/services/assessment/typings.d.ts`

在 `API` 命名空间下定义了完整的类型：
- `RoleConfig` - 角色配置
- `RiskItemConfig` - 风险评估项配置
- `AssessmentRiskItem` - 评估风险项
- `WorkloadRecord` - 工作量记录
- `AssessmentData` - 评估数据
- `ProjectInfo` - 项目信息
- `CalculateParams` - 计算参数
- `CalculationResult` - 计算结果
- `CreateProjectParams` - 创建项目参数

### 3. 重构 New.tsx

#### Import 变更
```typescript
// Before
import { history, useSearchParams } from '@umijs/max';

// After
import { history, useSearchParams } from '@umijs/max';
import { getConfigAll, getProjectDetail, calculateProjectCost, createProject } from '@/services/assessment';
```

#### 类型定义变更
```typescript
// Before: 本地定义所有类型
type RoleConfig = { id: number; role_name: string; unit_price: number; };
// ... 更多本地类型

// After: 使用 API 命名空间类型别名
type RoleConfig = API.RoleConfig;
type RiskItemConfig = API.RiskItemConfig;
type AssessmentData = API.AssessmentData;
// ...
```

#### 网络请求重构

**1. 加载配置数据 (useEffect)**
```typescript
// Before
const configResponse = await fetch('/api/config/all');
const configBody = await configResponse.json();
const nextConfig: ConfigData = {
  risk_items: Array.isArray(configBody?.data?.risk_items) ? configBody.data.risk_items : [],
  roles: Array.isArray(configBody?.data?.roles) ? configBody.data.roles : [],
};

// After
const configResult = await getConfigAll();
const nextConfig: ConfigData = {
  risk_items: Array.isArray(configResult?.data?.risk_items) ? configResult.data.risk_items : [],
  roles: Array.isArray(configResult?.data?.roles) ? configResult.data.roles : [],
};
```

**2. 加载项目详情**
```typescript
// Before
const projectResponse = await fetch(`/api/projects/${editId}`);
if (!projectResponse.ok) {
  throw new Error('加载项目数据失败');
}
const projectBody = await projectResponse.json();

// After
const projectResult = await getProjectDetail(editId);
```

**3. 计算报价 (handleCalculate)**
```typescript
// Before
const res = await fetch('/api/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  throw new Error('计算失败');
}
const body = await res.json();
setCalculationResult(body.data);

// After
const payload: API.CalculateParams = {
  ...assessmentData,
  roles: configData.roles,
};
const result = await calculateProjectCost(payload);
setCalculationResult(result.data);
```

**4. 保存项目 (ProForm.onFinish)**
```typescript
// Before
const res = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  const errorBody = await res.json();
  throw new Error(errorBody.error || '保存失败');
}
const result = await res.json();

// After
const payload: API.CreateProjectParams = {
  name: values.projectName,
  description: values.projectDescription,
  is_template: values.is_template || false,
  assessmentData: {
    ...assessmentData,
    roles: configData.roles,
  },
};
const result = await createProject(payload);
```

## 优势说明

### 1. 统一请求管理
- ✅ 所有 API 请求集中在 services 层
- ✅ 易于维护和修改
- ✅ 避免代码重复

### 2. 类型安全
- ✅ 使用 TypeScript 类型定义
- ✅ API 请求和响应类型明确
- ✅ 编译时类型检查

### 3. 错误处理
- ✅ `@umijs/max` 的 request 内置错误处理
- ✅ 支持请求拦截器和响应拦截器
- ✅ 统一的错误提示机制

### 4. 代码简洁
- ✅ 减少样板代码
- ✅ 无需手动处理 JSON 解析
- ✅ 无需手动设置请求头

### 5. 符合最佳实践
- ✅ 遵循 Ant Design Pro 推荐架构
- ✅ 参考 UserController 的实现模式
- ✅ 便于后续扩展（如 mock 数据、API 文档生成）

## 测试建议

1. **功能测试**
   - 测试新建评估流程
   - 测试编辑已有项目
   - 测试计算报价功能
   - 测试保存项目功能

2. **错误场景测试**
   - 网络断开时的表现
   - 后端返回错误时的提示
   - 无效数据的处理

3. **类型检查**
   - 运行 `npm run type-check` 确保类型无误
   - IDE 应正确提示类型

## 后续优化建议

1. **统一错误处理**
   - 在 `app.tsx` 中配置全局错误拦截器
   - 统一处理 401、403、500 等错误

2. **请求拦截器**
   - 添加 Token 认证（如需要）
   - 添加请求日志

3. **Loading 状态**
   - 考虑使用全局 Loading
   - 或者使用 ProComponents 的内置 Loading

4. **Mock 数据**
   - 在 `mock/` 目录下添加对应的 mock 文件
   - 便于前端独立开发

## 相关文件

- ✅ `frontend/ppa_frontend/src/services/assessment/index.ts` (新建)
- ✅ `frontend/ppa_frontend/src/services/assessment/typings.d.ts` (新建)
- ✅ `frontend/ppa_frontend/src/pages/Assessment/New.tsx` (重构)

## 验证状态

- ✅ TypeScript 编译通过
- ✅ ESLint 无错误
- ⏳ 功能测试待用户确认
