<!-- markdownlint-disable -->

# 前端 Bug 修复记录（整合版）

> **最后更新**: 2025-11-06  
> **适用范围**: PPA 项目前端 (frontend/ppa_frontend/)  
> **框架版本**: UMI Max v4+ + Ant Design Pro + React 18

---

## 📋 目录

1. [React 依赖冲突问题](#1-react-依赖冲突问题)
2. [ProTable 组件集成问题](#2-protable-组件集成问题)
3. [代码重构与编译错误](#3-代码重构与编译错误)
4. [表单数据绑定与重渲染](#4-表单数据绑定与重渲染)
5. [UMI Max 配置限制](#5-umi-max-配置限制)
6. [组件化最佳实践](#6-组件化最佳实践)
7. [@ant-design/charts 图表配置问题](#7-ant-designcharts-图表配置问题)
8. [AntD v5 组件用法警告（Assessment）](#8-antd-v5-组件用法警告assessment)
9. [ProFormList 误用 recordCreatorProps 警告](#9-proformlist-误用-recordcreatorprops-警告)

---

## 1. React 依赖冲突问题

### 1.1 Invalid Hook Call 错误（多重 React 实例）

**故障现象**:  
应用白屏，浏览器控制台抛出严重错误：

```
Uncaught TypeError: Cannot read properties of null (reading 'useContext')
Warning: Invalid hook call
```

**根本原因**:  
应用中被加载了**多个不兼容的 React 实例**。当一个组件（如 Ant Design Pro 组件）尝试使用一个 React 实例的 Hook（如 `useContext`），但其父组件树是由另一个 React 实例渲染时，就会发生冲突。这通常由于 `node_modules` 依赖关系混乱或损坏导致。

**解决方案**:  
执行标准的依赖清理和重装流程，确保只有一个 React 实例：

```bash
# 在 frontend/ppa_frontend 目录下
# 1. 删除 node_modules
rm -rf node_modules

# 2. 删除锁文件
rm yarn.lock  # 或 package-lock.json

# 3. 重新安装依赖
yarn install  # 或 npm install

# 4. 重启开发服务器
yarn start
```

**检查清单**:
- [ ] 删除 `node_modules` 目录（完全）
- [ ] 删除 `yarn.lock` 或 `package-lock.json`
- [ ] 重新安装所有依赖
- [ ] 清空浏览器缓存
- [ ] 重启开发服务器

**关键经验**:
1. ✅ 依赖冲突通常不是代码问题，而是环境问题
2. ✅ 多人协作时确保所有人使用相同的包管理器（全项目只用 yarn 或 npm）
3. ✅ CI/CD 中应自动清理重装依赖，避免本地环境残留

**相关文件**:
- `frontend/ppa_frontend/package.json` - 依赖声明
- `frontend/ppa_frontend/yarn.lock` - 依赖锁定

---

## 2. ProTable 组件集成问题

### 2.1 数据更新后表格不渲染（返回格式不匹配）

**故障现象**:  
成功创建新数据后返回列表页面，表格没有显示新数据。浏览器网络面板显示 API 已返回包含新数据的数组，但 ProTable 没有渲染任何行。

**根本原因**:  
Ant Design Pro 的 `ProTable` 组件期望其 `request` 函数返回特定结构：

```typescript
// ✅ ProTable 期望的格式
{
  data: [...],        // 数据数组
  success: true,      // 成功标志
  total: number       // 总数
}

// ❌ 后端返回但 ProTable 无法处理的格式
[...]  // 直接返回数组
```

当后端直接返回数组时，ProTable 找不到 `data` 属性，导致无法渲染。

**解决方案**:  
在前端 `request` 函数中进行格式转换，兼容多种返回格式：

```typescript
// 正确的做法
request={async (params = {}) => {
  const result = await getPromptTemplates(params);
  
  // 检查返回格式并进行转换
  if (Array.isArray(result)) {
    // 后端直接返回数组，需要包装
    return {
      data: result,
      success: true,
      total: result.length,
    };
  } else if (result?.data) {
    // 后端返回标准格式，直接使用
    return {
      data: result.data,
      success: result.success !== false,
      total: result.total || result.data.length,
    };
  }
  
  // 异常处理
  return {
    data: [],
    success: false,
    total: 0,
  };
}}
```

**相关 Bug**:
- Sprint 2025-10-27: ProTable 不渲染新创建的数据

**检查清单**:
- [ ] 检查所有 ProTable 的 `request` 函数
- [ ] 确保返回值符合 `{ data, success, total }` 格式
- [ ] 后端 API 和前端处理要保持一致
- [ ] 添加错误边界处理异常返回

**相关文件**:
- `frontend/ppa_frontend/src/pages/ModelConfig/Prompts/index.tsx`

---

### 2.2 ProTable 新建记录报错（临时 Key 不唯一）

**故障现象**:  
在"角色与单价管理"、"差旅成本管理"等 Tab 中点击"新建"按钮时，应用报错：

```
Uncaught Error: 请设置 recordCreatorProps.record 并返回一个唯一的key
```

**根本原因**:  
在 `toolBarRender` 中的"新建"按钮的 `onClick` 事件中，调用 `actionRef.current?.addEditRecord?.()` 时，传入的新建记录对象为 `{ id: undefined, ... }`。ProTable 需要一个**临时的、唯一的**客户端 key 来追踪这个新行，但 `undefined` 无法满足要求。

**错误代码**:
```typescript
// ❌ 错误：id 为 undefined
actionRef.current?.addEditRecord?.({
  id: undefined, 
  ...otherFields
});
```

**解决方案**:  
为新记录的 `id` 赋予一个**临时的唯一值**，可使用时间戳或 UUID：

```typescript
// ✅ 正确：使用时间戳作为临时 key
actionRef.current?.addEditRecord?.({
  id: Date.now(),  // 时间戳保证唯一性
  ...otherFields
});

// ✅ 或使用 UUID（更安全）
import { v4 as uuidv4 } from 'uuid';
actionRef.current?.addEditRecord?.({
  id: uuidv4(),
  ...otherFields
});
```

**相关 Bug**:
- Sprint 2: ProTable 新建功能报错

**检查清单**:
- [ ] 检查所有 `addEditRecord` 调用
- [ ] 确保 `id` 不为 `undefined`
- [ ] 考虑使用 UUID 库（更安全且可读性强）
- [ ] 保存前通过 API 替换临时 ID 为真实 ID

**相关文件**:
- `frontend/ppa_frontend/src/pages/Configuration/Config.tsx` - RoleManagement, TravelCostManagement 组件

---

## 3. 代码重构与编译错误

### 3.1 编译时语法错误（import 重复、return 暴露、函数缺失）

**故障现象**:  
前端编译失败，报告多种语法错误：

```
TypeError: Duplicate declaration "PageContainer"
SyntaxError: 'return' outside of function
ReferenceError: handleTemplateChange is not defined
```

**根本原因**:  
在使用 `replace` 工具进行大规模代码重构时，过度依赖局部替换，导致：

1. **Import 语句重复** - 同一个模块被 import 多次
2. **函数体破损** - 多次替换导致大括号不匹配，`return` 暴露在顶层作用域
3. **函数定义丢失** - 重构过程中意外删除了重要函数

**错误代码示例**:
```typescript
// ❌ 错误：import 重复
import { PageContainer } from '@ant-design/pro-layout';
// ... 其他代码 ...
import { PageContainer } from '@ant-design/pro-layout';  // 重复

// ❌ 错误：return 暴露在顶层
const MyComponent = () => {
  // ... 函数体不完整
};  // 这里缺少闭合
return <div>...</div>;  // ← 暴露在顶层！

// ❌ 错误：函数定义丢失
// 原本存在的 handleTemplateChange 函数被删除了
```

**解决方案**:  
放弃零碎的 `replace` 策略，采用**一次性覆盖**整个文件：

```typescript
// ✅ 推荐：使用 write_file 或覆盖式 replace
// 1. 确保有完整、正确的源代码
// 2. 一次性写入整个文件
// 3. 验证编译通过

// 具体步骤：
// Step 1: 在本地编辑器中完成重构
// Step 2: 验证整个文件的语法正确性
// Step 3: 使用 write_file 一次性提交
// Step 4: 运行 npm run build 验证
```

**检查清单**:
- [ ] 检查文件顶部是否有重复 import
- [ ] 使用 IDE 的括号匹配检查（Ctrl+Shift+P → 括号匹配）
- [ ] 确保所有函数都有完整的大括号
- [ ] 编译通过后再提交代码
- [ ] 使用 ESLint 检查语法

**核心教训**:
1. ❌ 不要对大型文件进行多次局部 `replace`
2. ✅ 对于超过 200 行的重构，优先使用 `write_file` 或一次性 `replace`
3. ✅ 重构前在本地编辑器中完全完成，确保语法正确
4. ✅ 每次重构后立即运行编译检查

**相关 Bug**:
- Sprint 3: 编译错误 - `Unexpected token`
- Sprint 6: 编译错误 - `Duplicate declaration`, `return outside of function`

**相关文件**:
- `frontend/ppa_frontend/src/pages/Assessment/New.tsx` - 多次出现重构错误

---

### 3.2 组件化重构最佳实践（Sprint 8）

**项目背景**:  
`New.tsx` 文件包含约 900 行代码，所有子组件定义在一个文件中，导致可读性差、难以维护。

**重构方案**:  
将单个 900 行文件拆分为 5 个独立组件：

```
src/pages/Assessment/
├── New.tsx                      # 主容器 (265行)
└── components/
    ├── RiskScoringForm.tsx      # 风险评分 (110行)
    ├── WorkloadEstimation.tsx   # 工作量估算 (454行)
    ├── OtherCostsForm.tsx       # 其他成本 (55行)
    └── Overview.tsx             # 总览与保存 (123行)
```

**重构优势**:
- ✅ 主文件缩减 70% (900 → 265 行)
- ✅ 符合单一职责原则
- ✅ 提升代码可读性和可维护性
- ✅ 便于团队协作和单元测试
- ✅ IDE 性能提升（小文件加载快）

**状态管理设计**:
```typescript
// 所有共享状态在 New.tsx 中管理
New.tsx
  ├─ configData (配置数据)
  ├─ assessmentData (评估数据)
  └─ current (当前步骤)
       ↓
  Step 1: RiskScoringForm
       ↓ onValuesChange
  Step 2: WorkloadEstimation
       ↓ onWorkloadChange
  Step 3: OtherCostsForm
       ↓ onValuesChange
  Step 4: Overview
       ↓ createProject
```

**Props 设计原则**:
- 单向数据流：父组件 → 子组件
- 状态提升：共享数据在父组件
- 回调通信：子组件通过回调通知父组件

**后续优化建议**:
1. 将公共逻辑 (`normalizeRow`, `parseRiskOptions` 等) 提取为 utils
2. 使用 `React.memo` 优化不必要的重渲染
3. 添加单元测试覆盖
4. 考虑使用 Context API 替代过深的 props drilling

**相关文件**:
- `frontend/ppa_frontend/src/pages/Assessment/New.tsx` - 主容器
- `frontend/ppa_frontend/src/pages/Assessment/components/*` - 子组件

---

## 4. 表单数据绑定与重渲染

### 4.1 从模板导入功能数据不填充（Sprint 5）

**故障现象**:  
从"从模板创建"下拉框选择一个已保存的模板时，页面下方的所有表单（风险评分、工作量估算等）没有自动填充该模板数据。

**根本原因**:  
仅依赖 React 的声明式状态更新不足以处理复杂表单。当顶层状态 `assessmentData` 更新时，嵌套的 `ProForm` 和 `ProTable` 组件可能：

1. 没有正确监听状态变化
2. `initialValues` 只在首次挂载时生效
3. 需要主动调用表单实例方法才能更新值

**解决方案**:  
采用**命令式 + 声明式**混合方式，在 `handleTemplateChange` 中主动更新表单实例：

```typescript
const handleImportFromTemplate = async (projectId: number) => {
  try {
    const result = await getProjectDetail(projectId.toString());
    if (result?.data?.assessment_details_json) {
      const parsedData = JSON.parse(result.data.assessment_details_json);
      const normalizedData = {
        ...EMPTY_ASSESSMENT,
        ...parsedData,
        // 确保数组类型正确
        development_workload: Array.isArray(parsedData?.development_workload) 
          ? parsedData.development_workload 
          : [],
        // 确保数字类型正确
        travel_months: Number(parsedData?.travel_months ?? 0),
        // ... 其他字段
      };
      
      // 1. 更新顶层状态（声明式）
      setAssessmentData(normalizedData);
      
      // 2. 主动更新表单实例（命令式）
      form.setFieldsValue(normalizedData);
      
      message.success(`已从项目导入数据`);
    }
  } catch (error) {
    message.error('导入失败');
  }
};
```

**关键技术点**:
1. ✅ 使用 `form.setFieldsValue()` 主动更新表单
2. ✅ 在赋值前进行数据标准化（类型检查、默认值）
3. ✅ 对 JSON 字符串进行 try-catch 捕获异常
4. ✅ 为用户提供明确的操作反馈（成功/失败消息）

**常见陷阱**:
- ❌ 只更新状态，不调用 `form.setFieldsValue()`
- ❌ 不进行数据类型检查，导致表单值混乱
- ❌ 直接赋值原始 JSON，未处理可能的格式问题

**相关文件**:
- `frontend/ppa_frontend/src/pages/Assessment/New.tsx` - 模板导入逻辑

---

## 5. UMI Max 配置限制

### 5.1 无法屏蔽 findDOMNode 弃用警告（Sprint 1）

**故障现象**:  
启动前端开发服务器后，浏览器控制台持续出现警告：

```
Warning: findDOMNode is deprecated and will be removed in the next major release
```

这个警告来自 `antd` 或 `@ant-design/pro-components` 中的某些组件（如 `Tooltip`）在 React 18 严格模式下使用了不推荐的 API。

**失败的尝试**:

| 尝试方法 | 配置项 | 结果 | 原因 |
|--------|--------|------|------|
| 方案 1 | `react-strict-mode: false` | ❌ | UMI 不认识此配置 |
| 方案 2 | `strictMode: { react: false }` | ❌ | UMI 不认识此配置 |
| 方案 3 | `chainWebpack` + `IgnorePlugin` | ❌ | 思路错误，用于打包而非运行时 |
| 方案 4 | `stats.warningsFilter` | ❌ | UMI 不认识此配置 |
| 方案 5 | 修改 `src/app.tsx` 移除 `StrictMode` | ❌ | 脚手架未生成此文件 |

**最终决策**:

**接受现状** - 该警告视为已知、无害的开发环境问题：

1. ✅ 警告不影响应用功能
2. ✅ 只在开发环境出现，生产环境无此警告
3. ✅ 等待 Ant Design 或 UMI 版本升级解决
4. ✅ 继续推进功能开发

**后续处理**:
- [ ] 关注 Ant Design 后续版本升级
- [ ] 在项目文档中标注为已知问题
- [ ] 如果后续有专门的优化需求，可重新审视

**关键经验**:
1. ✅ 并非所有警告都能或应该被屏蔽
2. ✅ UMI Max v4+ 对配置严格校验，支持的配置有限
3. ✅ 有时接受和记录问题比强行解决更高效

**相关文件**:
- `frontend/ppa_frontend/.umirc.ts` - UMI 配置文件

---

## 6. 组件化最佳实践

### 6.1 从模板导入功能开发（Sprint 11）

**功能概述**:  
在新建评估页面添加"从模板导入"功能，允许用户从历史项目中选择一个作为模板，快速导入其评估数据。

**实现亮点**:

#### 数据安全处理
```typescript
// ✅ JSON 解析前进行类型检查
try {
  details = JSON.parse(project.assessment_details_json);
} catch (error) {
  console.error('Invalid JSON:', error);
  details = {}; // 提供默认值
}

// ✅ 导入后数据标准化
const normalizedData: AssessmentData = {
  ...EMPTY_ASSESSMENT,  // 默认值
  ...parsedData,        // 用户数据覆盖
  // 类型和数值检查
  development_workload: Array.isArray(parsedData?.development_workload) 
    ? parsedData.development_workload 
    : [],
  travel_months: Number(parsedData?.travel_months ?? 0),
};
```

#### 用户体验优化
```typescript
// ✅ 编辑模式自动过滤当前项目
const filteredList = editId 
  ? result.data.filter(p => p.id !== parseInt(editId))
  : result.data;

// ✅ 提供明确的操作反馈
message.success(`已从项目"${result.data.name}"导入数据`);
message.error('导入模板数据失败');

// ✅ Loading 状态反馈
const [loadingTemplates, setLoadingTemplates] = useState(false);
```

#### 响应式设计
```typescript
// ✅ 使用栅格布局适配不同屏幕
<Row gutter={[16, 16]} align="middle">
  <Col xs={24} sm={24} md={18} lg={18} xl={18}>
    {/* 统计信息 */}
  </Col>
  <Col xs={24} sm={24} md={6} lg={6} xl={6} style={{ textAlign: 'right' }}>
    {/* 导入按钮 */}
  </Col>
</Row>

// ✅ 表格分页避免一次性加载
pagination={{ pageSize: 10, showSizeChanger: true }}
```

**相关 API 调用**:
```typescript
// 获取所有项目列表（用于模板选择）
export async function getAllProjects(options?: { [key: string]: any }) {
  return request<{ data: API.ProjectInfo[] }>('/api/projects', {
    method: 'GET',
    ...(options || {}),
  });
}
```

**优化建议**:

| 优先级 | 功能 | 说明 |
|------|------|------|
| P1 | 导入前确认提示 | 添加二次确认对话框，防止误操作覆盖 |
| P1 | 搜索和筛选 | 添加项目名称搜索框，快速定位模板 |
| P2 | 部分导入 | 支持选择导入特定数据模块（如只导入风险评分） |
| P2 | 模板预览 | 导入前预览完整的模板数据 |
| P3 | 智能推荐 | 基于相似度推荐合适的模板 |

**相关文件**:
- `frontend/ppa_frontend/src/pages/Assessment/New.tsx` - 导入逻辑
- `frontend/ppa_frontend/src/services/assessment/index.ts` - API 服务

---

### 6.2 重新评估功能实现（Sprint 12）

**需求背景**:  
历史项目不允许直接编辑，用户希望以现有项目为基础创建新的评估项目。将"编辑"改为"重新评估"，语义更符合业务场景。

**业务规则**:
1. **历史项目只读**：所有已保存的项目不允许修改
2. **重新评估**：可以基于任何历史项目创建新项目
3. **模板导入**：重新评估功能与"从模板导入"功能相同，都是导入数据后创建新项目

**实现改动**:

#### 详情页按钮修改
```tsx
// ❌ 修改前
<Button key="edit" type="primary" onClick={() => history.push(`/assessment/new?edit_id=${project.id}`)}>
  编辑
</Button>

// ✅ 修改后
<Button 
  key="reassess" 
  type="primary" 
  onClick={() => history.push(`/assessment/new?template_id=${project.id}`)}
>
  重新评估
</Button>
```

#### 历史项目列表操作栏修改
```tsx
// ❌ 修改前
<Link key="edit" to={`/assessment/new?edit_id=${record.id}`}>编辑</Link>

// ✅ 修改后
<Link key="reassess" to={`/assessment/new?template_id=${record.id}`}>重新评估</Link>
```

#### 新建评估页面参数修改
```tsx
// ❌ 修改前：使用 edit_id 参数加载项目进行编辑
const editId = searchParams.get('edit_id');

// ✅ 修改后：使用 template_id 参数加载项目作为模板
const templateId = searchParams.get('template_id');

useEffect(() => {
  const loadInitialData = async () => {
    if (templateId) {
      const projectResult = await getProjectDetail(templateId);
      // 加载并规范化数据
      message.success(`已导入项目"${projectResult.data.name}"的数据作为模板`);
    }
  };
  loadInitialData();
}, [templateId, form]);
```

**用户使用流程**:

**场景一：从详情页重新评估**
1. 用户访问历史项目详情页
2. 点击"重新评估"按钮
3. 跳转到新建评估页面，自动导入该项目的所有数据
4. 显示提示信息："已导入项目"xxx"的数据作为模板"
5. 用户可以修改数据并保存为新项目

**场景二：从模板选择弹窗导入**
1. 用户在新建评估页面点击"从模板导入"
2. 从列表中选择项目
3. 点击"导入"
4. 自动填充所有评估数据
5. 用户可以修改数据并保存为新项目

**关键测试点**:
- [x] 详情页显示"重新评估"按钮（而非"编辑"）
- [x] 历史项目列表操作栏显示"重新评估"（而非"编辑"）
- [x] 点击"重新评估"跳转到新建评估页面
- [x] 所有评估数据正确导入
- [x] 显示导入成功提示消息
- [x] 可以修改导入的数据
- [x] 保存后创建新项目（不覆盖原项目）

**相关文件**:
- `frontend/ppa_frontend/src/pages/Assessment/Detail.tsx` - 详情页按钮
- `frontend/ppa_frontend/src/pages/Assessment/History.tsx` - 历史列表操作
- `frontend/ppa_frontend/src/pages/Assessment/New.tsx` - 新建页面逻辑

---

### 6.3 ProTable actionRef 无限循环修复（Sprint 13）

**问题描述**:  
在 AI 模型配置列表页面中，页面加载后立即崩溃，浏览器控制台抛出错误：

```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate. 
React limits the number of nested updates to prevent infinite loops.
```

**根本原因**:  
在 ProTable 组件中使用 `useState` 来保存 `actionRef`，并通过回调函数设置状态，导致无限循环：

```tsx
// ❌ 错误：触发无限循环
const [actionRef, setActionRef] = useState<any>();

<ProTable
  actionRef={(ref) => setActionRef(ref)}  // 每次渲染都调用 setState
  // ...
/>
```

**触发机制**:
1. 每次渲染时，`actionRef` 回调函数都会执行
2. 回调函数调用 `setActionRef(ref)` 触发状态更新
3. 状态更新导致组件重新渲染
4. 重新渲染又触发回调函数执行
5. 形成无限循环 ♻️

**解决方案**:

使用 `useRef` 替代 `useState` 来保存 ProTable 的 `actionRef`：

```tsx
// ✅ 修改前
import { useState } from 'react';

const AIModelApplication: React.FC = () => {
  const [actionRef, setActionRef] = useState<any>();

  const handleDelete = async (id: number) => {
    // ...
    actionRef?.reload();  // ❌ 错误调用方式
  };

  return (
    <ProTable
      actionRef={(ref) => setActionRef(ref)}  // ❌ 触发无限循环
      // ...
    />
  );
};

// ✅ 修改后
import { useRef } from 'react';
import type { ActionType } from '@ant-design/pro-components';

const AIModelApplication: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const handleDelete = async (id: number) => {
    // ...
    actionRef.current?.reload();  // ✅ 正确调用方式
  };

  return (
    <ProTable
      actionRef={actionRef}  // ✅ 直接传递 ref 对象
      // ...
    />
  );
};
```

**关键改动总结**:

| 步骤 | 改动内容 | 说明 |
|------|---------|------|
| 1 | 导入 `useRef` 和 `ActionType` | 使用正确的 Hook 和类型 |
| 2 | 使用 `useRef` 替代 `useState` | 避免触发重新渲染 |
| 3 | 直接传递 ref 对象 | 不使用回调函数 |
| 4 | 使用 `.current` 访问 | 通过 `.current` 访问 ref 值 |

**技术原理**:

| 特性 | useState | useRef |
|------|----------|--------|
| 更新触发渲染 | ✅ 是 | ❌ 否 |
| 持久化存储 | ✅ 是 | ✅ 是 |
| 适用场景 | 影响 UI 的状态 | DOM 引用、组件实例引用 |

**ProTable actionRef 正确用法**:

ProTable 的 `actionRef` 设计用于接收一个 React ref 对象，而不是回调函数。

```tsx
// ✅ 官方推荐方式
const actionRef = useRef<ActionType>();

<ProTable actionRef={actionRef} />

// 调用方法
actionRef.current?.reload();        // 刷新表格
actionRef.current?.reloadAndRest(); // 刷新并重置
actionRef.current?.reset();         // 重置表格
```

**识别此类问题的特征**:
- 错误信息包含 "Maximum update depth exceeded"
- 组件在加载后立即崩溃
- 开发工具显示组件不断重新渲染
- 使用了 `actionRef={(ref) => setXxx(ref)}` 模式

**检查清单**:
- [ ] 所有 ProTable/ProList 等 Pro 组件的 actionRef 使用 `useRef`
- [ ] 避免在渲染回调中调用 `setState`
- [ ] Form 组件的 form 实例使用 `Form.useForm()`
- [ ] 不在 `render` 函数中调用 setState

**相关文件**:
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/index.tsx` - 修复主文件

**参考资料**:
- [React Hooks - useRef](https://react.dev/reference/react/useRef)
- [ProTable 官方文档 - actionRef](https://procomponents.ant.design/components/table#actionref)
- [React 常见错误 - Maximum update depth exceeded](https://react.dev/reference/react/Component#componentdidupdate)

---

### 6.4 AI 模块分析服务复用（Sprint 14）

**问题描述**:  `ProjectModuleAnalyzer` 组件早期直接在组件内调用 `fetch('/api/ai/...')` 访问后端接口，绕过了 `@/services/assessment` 的统一封装。

**风险影响**:

- ❌ 失去全局请求拦截器、超时处理与鉴权注入
- ❌ 接口类型定义分散，service 层的变更无法同步
- ❌ 与 `AIAssessmentModal` 等其它 AI 流程重复实现，维护成本增加

**修复措施**:

```typescript
// ✅ 统一通过 assessment service 请求
const result = await analyzeProjectModules({
  description: trimmedDescription,
  projectType,
  projectScale,
  prompt: selectedPrompt,
  promptId: selectedPrompt?.id,
  variables: sanitizedVariables,
  template: 'project_module_analysis',
});
```

- 在 `frontend/ppa_frontend/src/services/assessment/index.ts` 中新增 `getModuleAnalysisPrompts`、`analyzeProjectModules` 以及对应的类型定义
- `ProjectModuleAnalyzer.tsx` 替换为使用上述 service，并对提示词变量进行字符串化处理
- 统一错误提示文案，成功时基于返回模块数量提示用户

**检查清单**:

- [ ] 所有 AI 组件请求均通过 `@/services/assessment`
- [ ] 新增 API 在 service 层导出并具备类型定义
- [ ] 组件内不再出现裸 `fetch('/api/...')`
- [ ] 错误 message 提示与其它 AI 功能保持一致

**相关文件**:

- `frontend/ppa_frontend/src/services/assessment/index.ts`
- `frontend/ppa_frontend/src/pages/Assessment/components/ProjectModuleAnalyzer.tsx`

---

## 7. 通用前端最佳实践

### 7.1 Ant Design Pro 表单处理
```typescript
// ✅ 推荐：获取表单实例进行主动控制
const [form] = Form.useForm();

// 导入数据时主动更新
const handleImport = async (data) => {
  const normalizedData = normalizeFormData(data);
  form.setFieldsValue(normalizedData);  // 主动设置值
};

// ✅ 推荐：使用 ProForm 的 onValuesChange
<ProForm
  form={form}
  onValuesChange={(changed, all) => {
    // 实时响应表单变化
    updateState(all);
  }}
/>
```

### 7.2 ProTable 使用规范
```typescript
// ✅ 推荐：request 函数总是返回标准格式
request={async (params) => {
  try {
    const result = await fetchData(params);
    return {
      data: Array.isArray(result) ? result : result.data || [],
      success: true,
      total: Array.isArray(result) ? result.length : result.total,
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      total: 0,
    };
  }
}}

// ✅ 推荐：在 toolBarRender 中创建新行时提供唯一 key
onClick={() => {
  actionRef.current?.addEditRecord?.({
    id: Date.now(),  // 或 uuidv4()
    // ... 其他初始值
  });
}}
```

### 7.3 数据流设计
```typescript
// ✅ 推荐：单向数据流
Parent Component (状态管理)
  │
  ├─ State: data, loading, error
  ├─ Functions: handleUpdate, handleDelete
  │
  └─ Child Components (展示和交互)
       │
       ├─ Props: data, onUpdate, onDelete
       └─ 只通过回调函数通知父组件
```

### 7.4 错误处理与用户反馈
```typescript
// ✅ 推荐：统一的错误处理模式
try {
  setLoading(true);
  const result = await apiCall();
  message.success('操作成功');
  // 更新状态
} catch (error) {
  console.error('Error:', error);
  message.error(error.message || '操作失败，请重试');
} finally {
  setLoading(false);
}
```

---

## 8. 快速排查指南

### 前端问题排查流程

**步骤 1: 清理环境**
```bash
# 删除依赖缓存
rm -rf node_modules yarn.lock

# 重新安装
yarn install

# 清空浏览器缓存（或 Ctrl+Shift+Delete）
# 重启开发服务器
yarn start
```

**步骤 2: 检查编译错误**
```bash
# 查看编译输出
yarn build

# 排查常见错误
- Import 语句重复？
- 括号是否匹配？
- 是否有语法错误（红色波浪线）？
```

**步骤 3: 浏览器控制台检查**
```javascript
// Console 标签页查看
- JavaScript 错误（红色）
- 警告（黄色）
- 网络错误

// Network 标签页查看
- API 请求是否成功？
- 返回的数据格式是否正确？
```

**步骤 4: 验证数据绑定**
```typescript
// React DevTools 检查
- Props 是否正确传递？
- 状态是否正确更新？
- 组件是否重渲染？
```

### 常见问题对应表

| 问题现象 | 可能原因 | 解决方案 | 对应章节 |
|--------|--------|--------|---------|
| 白屏 + Invalid hook call | React 实例冲突 | 清理重装依赖 | [§1.1](#11-invalid-hook-call-错误多重-react-实例) |
| ProTable 无数据 | 返回格式不匹配 | 转换为标准格式 | [§2.1](#21-数据更新后表格不渲染返回格式不匹配) |
| ProTable 新建崩溃 | 临时 key 为 undefined | 使用时间戳/UUID | [§2.2](#22-protable-新建记录报错临时-key-不唯一) |
| 编译错误（Unexpected token） | 代码语法错误 | 一次性覆盖整个文件 | [§3.1](#31-编译时语法错误import-重复return-暴露函数缺失) |
| 表单数据不填充 | 未主动更新表单 | 调用 form.setFieldsValue | [§4.1](#41-从模板导入功能数据不填充sprint-5) |
| 控制台警告太多 | UMI 配置限制 | 接受现状或升级依赖 | [§5.1](#51-无法屏蔽-finddomnode-弃用警告sprint-1) |

---

## 9. 相关文档

- **项目架构**: `WARP.md` - 完整架构说明
- **前端详细文档**: `frontend/ppa_frontend/README.md` - 开发指南
- **后端 Bug 记录**: `docs/bugfix/BACKEND-BUGFIX-CONSOLIDATED.md` - 后端问题参考
- **UMI Max 文档**: https://umijs.org/
- **Ant Design Pro 文档**: https://pro.ant.design/

---

## 10. 变更历史

| 日期 | 变更内容 | 相关 Sprint |
|------|--------|-----------|
| 2025-11-06 | 整合 Sprint 12-13，更新文档结构 | Sprint 12-13 |
| 2025-11-01 | 整合文档，删除过时内容 | - |
| 2025-10-23 | 修复 ProTable actionRef 无限循环问题 | Sprint 13 |
| 2025-10-22 | 实现重新评估功能（替换编辑功能） | Sprint 12 |
| 2025-10-22 | 添加从模板导入功能 | Sprint 11 |
| 2025-10-21 | 完成组件化重构 | Sprint 8 |
| 2025-10-27 | ProTable 数据渲染修复 | - |
| Sprint 6 | 编译错误修复 | Sprint 6 |
| Sprint 5 | 模板导入功能设计 | Sprint 5 |
| Sprint 3 | 编译错误排查 | Sprint 3 |
| Sprint 2 | ProTable 新建功能修复 | Sprint 2 |
| Sprint 1 | findDOMNode 警告已知问题 | Sprint 1 |

---

**维护说明**: 本文档应随项目演进持续更新。当出现新的问题或重构时，应及时补充新的最佳实践，删除过时内容。

**文档版本**: 2.2（整合版）  
**最后审核**: 2025-11-06

---

## 7. @ant-design/charts 图表配置问题

### 7.1 图表 Label 配置兼容性错误（Dashboard 实现）

**故障现象**:  
使用 @ant-design/charts (v2.6.5) 时，浏览器控制台抛出多个错误：

```javascript
ExpressionError: Undefined variable: value
ExpressionError: Unexpected character: }
Error: Unknown Component: shape.inner
```

**发生时间**: 2025-11-06（Story 2: Dashboard 前端UI/UX实现）

**根本原因**:  
@ant-design/charts 的 label 配置与原生 G2Plot 存在兼容性差异：

1. **不支持字符串模板格式**: `label: { content: '{value}' }` 或 `'{name} {percentage}'`
2. **不支持特定 type 值**: `label: { type: 'inner' }` 会触发 "Unknown Component" 错误
3. **formatter 参数可能为 undefined**: 需要添加空值检查

**错误代码示例**:

```typescript
// ❌ 错误：使用字符串模板（不被支持）
const pieConfig = {
  label: {
    content: '{value}',  // 导致 "Undefined variable" 错误
  }
};

// ❌ 错误：使用 type: 'inner'（不被支持）
const pieConfig = {
  label: {
    type: 'inner',  // 导致 "Unknown Component: shape.inner" 错误
    content: '{name}\n{percentage}'
  }
};

// ❌ 错误：formatter 没有空值检查
const columnConfig = {
  label: {
    formatter: (datum: any) => `¥${datum.cost.toLocaleString()}`
    // 当 datum.cost 为 undefined 时报错
  }
};
```

**解决方案**:

```typescript
// ✅ 方案 1: 使用 formatter 函数 + 空值检查
const pieConfig = {
  data: chartData,
  angleField: 'value',
  colorField: 'type',
  label: {
    formatter: (datum: any) => {
      const type = datum?.type ?? '';
      const value = datum?.value ?? 0;
      return `${type}: ${value}`;
    },
  },
};

// ✅ 方案 2: 完全禁用 label（最保险）
const pieConfig = {
  data: chartData,
  angleField: 'value',
  colorField: 'type',
  label: false,  // 禁用标签，通过图例识别数据
  legend: {
    position: 'bottom' as const,
  },
};

// ✅ 方案 3: 简化配置，避免复杂的 label 选项
const columnConfig = {
  data: roleCostData,
  xField: 'role',
  yField: 'cost',
  label: false,  // 暂时禁用，避免兼容性问题
  yAxis: {
    label: {
      formatter: (v: string) => `¥${Number(v || 0).toLocaleString()}`,
    },
  },
};
```

**最佳实践检查清单**:

- [ ] 使用 formatter 函数而非字符串模板
- [ ] formatter 中添加空值检查（使用 `?.` 和 `??`）
- [ ] 避免使用 `type: 'inner'`, `type: 'outer'` 等配置
- [ ] 避免使用 `offset`, `style` 等高级 label 配置
- [ ] 优先考虑禁用 label，通过图例展示数据
- [ ] 测试各种数据状态（空数据、部分字段缺失等）

**影响范围**:
- 所有使用 @ant-design/charts 的图表组件
- Pie、Donut、Column、Line、Scatter 等图表类型

**相关文件**:
- `frontend/ppa_frontend/src/pages/Dashboard.tsx` - Dashboard 图表配置
- `frontend/ppa_frontend/package.json` - @ant-design/charts 版本

**参考资料**:
- [@ant-design/charts 官方文档](https://charts.ant.design/)
- [G2Plot API 文档](https://g2plot.antv.antgroup.com/)

---

### 7.2 Spin 组件 tip 属性警告

**故障现象**:  
浏览器控制台显示警告：

```
Warning: [antd: Spin] `tip` only work in nest or fullscreen pattern.
```

**发生时间**: 2025-11-06（Dashboard 实现）

**根本原因**:  
Ant Design 的 Spin 组件的 `tip` 属性只能在嵌套模式（有子元素）或全屏模式下使用。单独使用 `<Spin tip="..." />` 会触发警告。

**错误代码**:

```typescript
// ❌ 错误：单独使用 tip 属性
<Spin size="large" tip="加载数据中..." />
```

**解决方案**:

```typescript
// ✅ 方案 1: 使用嵌套模式
<Spin size="large">
  <div style={{ padding: '50px' }}>加载数据中...</div>
</Spin>

// ✅ 方案 2: 使用嵌套模式包裹实际内容
<Spin spinning={loading} tip="加载中...">
  <div>
    {/* 实际内容 */}
  </div>
</Spin>
```

**最佳实践**:
- 始终在 Spin 组件中包含子元素
- 或者移除 `tip` 属性，仅使用 loading 动画

**相关文件**:
- `frontend/ppa_frontend/src/pages/Dashboard.tsx`

---

### 7.3 图表数据格式化最佳实践

**背景**:  
在实现 Dashboard 时发现，正确的数据格式化对图表显示至关重要。

**常见问题**:

1. **坐标轴标签格式化**: 数值显示不友好
2. **Tooltip 格式化**: 悬浮提示信息不完整
3. **数据单位处理**: 货币、百分比等单位显示

**最佳实践示例**:

```typescript
// ✅ Y轴标签格式化（货币）
const config = {
  yAxis: {
    label: {
      formatter: (v: string) => `¥${Number(v || 0).toLocaleString()}`,
    },
  },
};

// ✅ Tooltip 格式化
const config = {
  tooltip: {
    formatter: (datum: any) => {
      const cost = datum?.totalCost ?? 0;
      return {
        name: '总成本',
        value: `¥${cost.toLocaleString()}`,
      };
    },
  },
};

// ✅ 数据转换（风险等级分类）
const riskChartData = riskDistribution.map(item => ({
  type: item.final_risk_score < 50 ? '低风险' 
      : item.final_risk_score < 100 ? '中风险' 
      : '高风险',
  value: item.count,
}));

// ✅ 安全的数据映射（防止空对象）
const roleCostData = Object.entries(roleCostDistribution || {}).map(([role, cost]) => ({
  role,
  cost: cost || 0,
}));
```

**重要提示**:
1. 始终对 API 返回数据进行验证和默认值处理
2. 使用 TypeScript 类型定义确保数据结构正确
3. 添加空数据状态处理（Empty 组件）
4. 在 useEffect 中添加错误处理

**相关文件**:
- `frontend/ppa_frontend/src/pages/Dashboard.tsx`
- `frontend/ppa_frontend/src/services/dashboard/typings.d.ts`

---

## 8. AntD v5 组件用法警告（Assessment）

### 8.1 message 静态函数上下文警告（Assessment 页面）

**故障现象**:  
浏览器控制台持续输出：

```
Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.
```

**发生时间**: 2025-11-14（执行“第一步/第二步”流程时）

**根本原因**:  
Ant Design v5 中，`message.success/error/warning/info` 等静态调用无法消费动态主题/上下文（如 App/ConfigProvider 的 context），在复杂的运行时主题或嵌套场景下会触发上述警告。

**解决方案**:  
改为使用作用域消息 API：

```tsx
const [messageApi, contextHolder] = message.useMessage();
// 在组件 JSX 顶层渲染 {contextHolder}
messageApi.success('操作成功');
```

并将组件内所有 `message.*` 静态调用替换为 `messageApi.*`。

**受影响文件**:
- `frontend/ppa_frontend/src/pages/Assessment/components/ProjectModuleAnalyzer.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/Detail.tsx`

**验证**:
- 进入“新建评估 → AI模块梳理”，点击“开始AI模块分析”，无上述 message 警告。
- 打开“风险评分 → AI评估弹窗”，进行评估与应用结果流程，无上述 message 警告。

---

## 9. ProFormList 误用 recordCreatorProps 警告

**故障现象**:  
控制台出现 React 警告：

```
Warning: React does not recognize the `recordCreatorProps` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `recordcreatorprops` instead. If you accidentally passed it from a parent component, remove it from the DOM element.
```

**根本原因**:  
`recordCreatorProps` 是 `EditableProTable` 的属性，不是 `ProFormList` 的属性。将其误传给 `ProFormList` 会被继续传递到原生 DOM 节点，从而触发 React 未识别属性的警告。

**错误用法（已移除）**:

```tsx
<ProFormList
  name="risk_items"
  label="风险成本"
  creatorButtonProps={{ creatorButtonText: '新增风险项' }}
  recordCreatorProps={{              // ❌ 非法属性（仅适用于 EditableProTable）
    newRecordType: 'dataSource',
    record: () => ({ id: Date.now(), content: '', cost: 0 }),
  }}
>
```

**正确做法**:
- 若需新增按钮文案，使用 `creatorButtonProps`（已使用）。
- 若需默认值，使用 `initialValue` 提供初始数组项，或在外层 `form.setFieldsValue` 设置。
- 仅在 `EditableProTable` 上使用 `recordCreatorProps`。

**修复变更**:
- 从 `ProFormList` 上移除 `recordCreatorProps`：
  - `frontend/ppa_frontend/src/pages/Config.tsx`
  - `frontend/ppa_frontend/src/pages/Assessment/components/OtherCostsForm.tsx`
- 保留 `EditableProTable` 的合法 `recordCreatorProps`：
  - `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx`

**验证**:
- 在“配置 → 新建/编辑风险评估项”与“其他成本 → 风险成本”中新增条目，不再出现该 React 警告；表单功能正常。

---

### 8.2 Spin tip 使用方式（Assessment 页面补充）

**故障现象**:  
控制台出现：

```
Warning: [antd: Spin] `tip` only work in nest or fullscreen pattern.
```

**根本原因**:  
Spin 的 `tip` 仅在“嵌套（有子元素）”或“全屏”模式下生效，孤立使用 `<Spin tip="..." />` 会告警。

**修复方式（在 Assessment 页面落地）**:

```tsx
// 嵌套一个最小子元素，或拆出说明文本
<Spin size="large" tip="AI正在分析项目需求，生成模块结构中...">
  <div style={{ minHeight: 24 }} />
  {/* 或者移除 tip，将文字放到下方 */}
</Spin>
```

**受影响文件**:
- `frontend/ppa_frontend/src/pages/Assessment/components/ProjectModuleAnalyzer.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/Detail.tsx`

**验证**:
- 模块梳理加载态与详情页加载态下，不再出现 Spin tip 警告；UI 展示保持一致。

---

## 10. 工作量估算新增记录工时被手动覆盖

**故障现象**: 在“新建评估 > 第二步工作量估算”中，用户点击“新增功能项/新增对接项”后，表格允许直接编辑“工时(人/天)”列。当交付系数被修改时，点击“保存”不会触发重新计算，导致工时数值与详情弹窗/AI 评估结果不一致。

**根本原因**:

1. `EditableProTable` 的 `workload` 列未禁用，行内编辑会覆盖详情弹窗计算出的值。
2. 保存行后只是把表单数据写回列表，没有对交付系数变动进行二次计算。

**修复方案**:

1. 将 `workload` 列改为纯展示列并禁用编辑，同时在标题上加 Tooltip 说明“该字段会在详情页或 AI 评估后自动计算”。
2. 在 `handleDevChange` / `handleIntegrationChange` 中合并原始记录和当前编辑值，只要是新增记录或交付系数发生变化，就复用 `calculateWorkload` 逻辑即时重算工时，再通过 `normalizeList` 保持数值格式。

**关键提交文件**:
- `frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx`

**验证清单**:
- [ ] 新增行时，“工时(人/天)”列禁用输入，只显示只读值。
- [ ] 修改交付系数后点击“保存”，相应行的工时会自动刷新。
- [ ] 详情弹窗和 AI 评估仍可继续覆盖工时，表格展示保持一致。

---

## 11. AI 模型面板“查看全部模块”无响应

**故障现象**: 在“生成总览”步骤的“AI 模型使用情况”卡片中，工作量评估列表超过 5 条时会出现“查看全部 X 个模块”按钮，但点击后没有任何反馈，无法查看完整的 AI 评估模块。

**根本原因**: 按钮只是一个样式化的 `Button`，既没有绑定 `onClick` 事件，也没有对应的弹窗或抽屉组件展示完整数据。

**修复方案**:

1. 在 `AIUsagePanel` 内部引入 `Modal` 并使用 `useState` 管理显隐。
2. 将按钮点击事件绑定到 `setAllModulesVisible(true)`，并在弹窗中循环渲染全部 `workloadEvaluations`，附带模块类型/角色/时间信息，支持滚动浏览。
3. 复用统一的 `renderEvaluationItem` 渲染函数，保证弹窗与预览列表的样式一致。

**关键文件**:
- `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`

**验证清单**:
- [ ] 当 AI 评估模块 > 5 条时显示“查看全部”按钮。
- [ ] 点击按钮能够弹出“全部 AI 评估模块”对话框并展示所有记录。
- [ ] 关闭对话框后再次打开仍能看到完整数据。

---

## 12. AI 模型使用情况未引用“当前模型”

**故障现象**: “生成总览”步骤的“AI 模型使用情况”面板中，风险评估、模块梳理与工作量评估的模型标签始终显示为固定的 `GPT-4 / OpenAI`，与模型配置模块中设置的“当前使用模型”不一致，导致展示信息与真实配置脱节。

**根本原因**: 面板依赖 `assessmentData` 中旧的 `model_info` 字段或直接写死标签，从未调用模型配置模块的 `getCurrentModel` 接口获取系统当前模型。

**修复方案**:

1. 在 `Overview` 组件中引入 `getCurrentModel`，页面加载时拉取当前模型并缓存。
2. 所有 AI 使用信息（风险评估、模块梳理、工作量评估）统一使用当前模型名称/Provider，若后端返回为空则展示“未配置模型”。
3. 工作量评估列表的 Tag 也改为动态展示，保证和模型配置模块一致。

**关键文件**:
- `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`

**验证清单**:
- [ ] 在模型配置模块切换“当前模型”后返回“生成总览”，面板标签同步更新。
- [ ] 风险评估、模块梳理、工作量评估三个区域展示的模型信息一致。
- [ ] “查看全部模块”弹窗中的数据不受影响。

---

## 13. 模板唯一性与历史项目模板删除限制

**故障现象**:

1. 在评估第 4 步勾选“另存为模板”多次保存后，`projects` 表中可能存在多条 `is_template = 1` 的记录，违背了“全局仅一个当前模板”的设计预期，导致：
   - 前端“从模板一键填充”无法明确应该使用哪条记录。
   - 历史项目列表中无法准确标识唯一的“当前模板”。
2. 历史项目列表中模板项目与普通项目在删除上没有区分，理论上可以直接删除模板记录，容易造成误删。

**根本原因**:

- 后端在 `createProject` / `updateProject` 时只是按请求体直接写入 `is_template`，没有在数据库层面做互斥处理；  
- 历史列表删除操作仅按 `id` 调用 `DELETE /api/projects/:id`，未检查 `is_template` 字段。

**修复方案**:

1. **后端模板唯一性保证**（服务层 + 模型层）  
   - 在 `projectModel` 中新增 `clearAllTemplateFlags()` 方法：  
     - SQL: `UPDATE projects SET is_template = 0 WHERE is_template = 1`。  
   - 在 `projectService.createProject` / `projectService.updateProject` 中：  
     - 若 `projectData.is_template` 为真，先调用 `clearAllTemplateFlags()`，再将当前项目写为 `is_template = 1`，保证任意时刻表中最多有一条模板。
2. **历史项目列表包含模板，并显式标识**  
   - 新增 `projectModel.getAllProjectsIncludingTemplates()`，返回所有项目（包含 `is_template` 字段）。  
   - `projectController.getAllProjects` 在未带 `is_template` 查询参数时改为使用该方法，使历史列表能同时看到模板和非模板，并在前端增加“是否模板”列。
3. **前端禁止删除当前模板**  
   - `History` 页面操作列中：
     - 若 `record.is_template` 为真，则不展示删除 Popconfirm，而是展示禁用的“删除”按钮并附带 Tooltip：「当前模板不可删除，请先在新评估中设置新的模板」。  
     - 仅对 `is_template = 0` 的普通项目保留实际删除能力。

**关键文件**:
- 后端：
  - `server/models/projectModel.js`
  - `server/services/projectService.js`
  - `server/controllers/projectController.js`
- 前端：
  - `frontend/ppa_frontend/src/services/projects/typings.d.ts`
  - `frontend/ppa_frontend/src/pages/Assessment/History.tsx`

**验证清单**:
- [ ] 连续多次在第 4 步勾选“保存为模板”保存项目后，数据库中始终只有一条记录的 `is_template = 1`。  
- [ ] 历史项目列表中“是否模板”列最多只显示一条“当前模板”。  
- [ ] 当前模板行在历史列表中无法被删除，Tooltip 提示文案正确。  
- [ ] 非模板项目仍然可以正常删除，并刷新列表。  
- [ ] “从模板一键填充”功能始终使用当前模板数据，行为稳定。

---

## 14. 风险 AI 评估提示词模板未按分类过滤

**故障现象**:  
新建评估第一步的“一键 AI 评估”弹窗中，提示词模板下拉会列出所有激活的模板，包括工作量评估、成本估算、报表生成等非“风险分析”用途的模板。选择不合适的模板会导致提示词不匹配，评估结果乱、用户困惑。

**根本原因**:  
`GET /api/ai/prompts` 后端直接返回所有活跃模板（`aiPromptService.getAllPrompts()`），未按 `category` 做过滤；前端 `AIAssessmentModal` 也未做分类筛选。

**修复方案**:

1. 将 `/api/ai/prompts` 接口限定为“风险分析”用途：  
   - 在 `aiController.getPrompts` 中改用 `aiPromptService.getPromptsByCategory('risk_analysis')`，只返回 `category = 'risk_analysis'` 及兼容别名下的模板。  
   - 日志中记录 `category: 'risk_analysis'`，便于监控。  
2. 保持模块梳理 & 工作量评估接口独立：  
   - 模块梳理仍使用 `/api/ai/module-prompts`。  
   - 工作量评估仍使用 `/api/ai/workload-prompts`。  
   - 确保其它 AI 功能不依赖 `/api/ai/prompts`，避免被这次过滤影响。

**关键文件**:
- 后端：
  - `server/controllers/aiController.js`
  - `server/services/aiPromptService.js`（原有 `getPromptsByCategory` 复用）
- 前端：
  - `frontend/ppa_frontend/src/services/assessment/index.ts`
  - `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.tsx`

**验证清单**:
- [ ] 在模型配置中创建多个不同分类的提示词模板，仅将部分设置为 `风险分析 (risk_analysis)`。  
- [ ] 新建评估第一步打开“一键 AI 评估”，模板下拉只出现风险分析类模板。  
- [ ] 模块梳理与工作量评估使用的模板列表不受影响。  
- [ ] 选择风险分析模板进行评估时，返回的风险项评分结构符合预期。

---
