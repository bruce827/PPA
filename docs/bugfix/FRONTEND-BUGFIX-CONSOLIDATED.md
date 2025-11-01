# 前端 Bug 修复记录（整合版）

> **最后更新**: 2025-11-01  
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
| 2025-11-01 | 整合文档，删除过时内容 | - |
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

**文档版本**: 2.0（整合版）  
**最后审核**: 2025-11-01
