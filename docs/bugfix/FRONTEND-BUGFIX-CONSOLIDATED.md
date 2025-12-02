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
10. [AI 风险评估结果为空时的提示优化](#10-ai-风险评估结果为空时的提示优化)
11. [重新评估功能实现](#11-重新评估功能实现)
12. [actionRef 无限循环问题修复](#12-actionref-无限循环问题修复)
13. [工作量评估提示词弹窗两项修复](#13-工作量评估提示词弹窗两项修复)
14. [模型配置“设为当前”开关异常修复](#14-模型配置设为当前开关异常修复)

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

## 10. AI 风险评估结果为空时的提示优化

### 10.1 “开始 AI 评估”在模型返回空结果时直接报错

**故障现象**:  

- 在“新建项目评估”页面点击“开始 AI 评估”按钮（`/assessment/New.tsx` → `AIAssessmentModal`）时：
  - 豆包、通义千问等模型通常会返回带有多条 `risk_scores` 的结果；
  - 智谱 GLM、腾讯云混元等模型在项目文档信息不足时，会返回：
    ```json
    {
      "risk_scores": [],
      "overall_suggestion": "因未提供项目信息，暂无法进行有效风险评估。",
      "missing_risks": []
    }
    ```
  - 旧逻辑中，前端在检测到 `risk_scores` 为空时直接抛出错误：
    ```ts
    if (!effectiveResult?.risk_scores || effectiveResult.risk_scores.length === 0) {
      throw new Error('AI响应格式不正确：缺少风险评分数据');
    }
    ```
  - 用户看到的是红色错误提示“AI 响应格式不正确”，而不是更符合实际的“模型没有给出任何风险项”提示。

**根本原因**:  

- 前端将“模型确实返回了合法 JSON，但 `risk_scores` 为空”的情况，与“后端解析失败 / 返回格式错误”的情况混为一谈。
- 对于 GLM、混元这类在信息不足时选择返回空列表而不是编造结果的模型，这种处理方式显得过于苛刻，导致用户误以为系统出错。

**修复方案**:  

- 文件：`frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.tsx`
- 在处理 `assessRiskWithAI` 返回值的逻辑中，对“空结果”进行软处理，而不是直接抛错：

```ts
const serviceData = result.data || {};
const parsedResult: AssessmentResult | undefined = serviceData.parsed;

let effectiveResult: AssessmentResult | null = null;
if (parsedResult?.risk_scores?.length) {
  effectiveResult = parsedResult;
} else if (serviceData.raw_response) {
  effectiveResult = parseAIResponse(serviceData.raw_response);
} else if (
  parsedResult &&
  Array.isArray(parsedResult.risk_scores) &&
  parsedResult.risk_scores.length === 0
) {
  // 后端已解析出合法结构，但 risk_scores 为空
  effectiveResult = parsedResult;
}

if (!effectiveResult?.risk_scores || effectiveResult.risk_scores.length === 0) {
  setAssessmentResult({
    risk_scores: [],
    missing_risks: effectiveResult?.missing_risks,
    overall_suggestion:
      effectiveResult?.overall_suggestion ||
      '模型未返回任何风险评分，请检查文档内容或提示词配置。',
    confidence: effectiveResult?.confidence,
  });
  setLatestModel(serviceData.model_used || selectedPrompt?.model_hint || null);
  messageApi.warning('AI评估完成，但未返回任何风险评分。');
  return;
}

setAssessmentResult(effectiveResult);
setLatestModel(serviceData.model_used || selectedPrompt?.model_hint || null);
messageApi.success('AI评估完成');
```

**效果**:  

- 对于返回非空 `risk_scores` 的模型（豆包、通义千问等），行为保持不变。
- 对于 GLM、混元等在信息不足时返回空列表的模型：
  - 前端不再将其视为“格式错误”，不会抛异常终止流程；
  - Modal 中仍可展示模型给出的 `overall_suggestion` 等文本；
  - 通过 `message.warning` 给出黄底提示：
    > “AI评估完成，但未返回任何风险评分。”
  - 用户可以由此判断需要补充“项目文档”或调整提示词，而不是误以为系统故障。

**相关文件**:
- `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.tsx`

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

## 12. actionRef 无限循环问题修复

### 问题描述

**报错时间**: 2025-10-23  
**影响功能**: AI 模型配置列表页面  
**严重程度**: 高（页面无法正常渲染）

#### 错误信息

```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate. 
React limits the number of nested updates to prevent infinite loops.
```

#### 错误位置

文件: `frontend/ppa_frontend/src/pages/ModelConfig/Application/index.tsx`  
行号: 106

```tsx
actionRef={(ref) => setActionRef(ref)}
```

### 问题原因

在 ProTable 组件中使用 `useState` 来保存 `actionRef`，并通过回调函数设置状态：

```tsx
const [actionRef, setActionRef] = useState<any>();

<ProTable
  actionRef={(ref) => setActionRef(ref)}
  // ...
/>
```

**触发原因**:
1. 每次渲染时，`actionRef` 回调函数都会执行
2. 回调函数调用 `setActionRef(ref)` 触发状态更新
3. 状态更新导致组件重新渲染
4. 重新渲染又触发回调函数执行
5. 形成无限循环

### 解决方案

#### 修改前

```tsx
import { useState } from 'react';

const AIModelApplication: React.FC = () => {
  const [actionRef, setActionRef] = useState<any>();

  const handleDelete = async (id: number) => {
    // ...
    actionRef?.reload();
  };

  return (
    <ProTable
      actionRef={(ref) => setActionRef(ref)}
      // ...
    />
  );
};
```

#### 修改后

```tsx
import { useRef } from 'react';
import type { ActionType } from '@ant-design/pro-components';

const AIModelApplication: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const handleDelete = async (id: number) => {
    // ...
    actionRef.current?.reload();
  };

  return (
    <ProTable
      actionRef={actionRef}
      // ...
    />
  );
};
```

#### 关键改动

1. **导入 `useRef` 和 `ActionType`**
   ```tsx
   import { useRef, useState } from 'react';
   import type { ActionType } from '@ant-design/pro-components';
   ```

2. **使用 `useRef` 替代 `useState`**
   ```tsx
   // 错误方式
   const [actionRef, setActionRef] = useState<any>();
   
   // 正确方式
   const actionRef = useRef<ActionType>();
   ```

3. **直接传递 ref 对象**
   ```tsx
   // 错误方式
   actionRef={(ref) => setActionRef(ref)}
   
   // 正确方式
   actionRef={actionRef}
   ```

4. **使用 `.current` 访问 ref**
   ```tsx
   // 错误方式
   actionRef?.reload();
   
   // 正确方式
   actionRef.current?.reload();
   ```

### 技术原理

#### useState vs useRef

| 特性 | useState | useRef |
|------|----------|--------|
| 更新触发渲染 | ✅ 是 | ❌ 否 |
| 持久化存储 | ✅ 是 | ✅ 是 |
| 适用场景 | 影响 UI 的状态 | DOM 引用、组件实例引用 |

#### ProTable actionRef 的正确用法

ProTable 的 `actionRef` 设计用于接收一个 React ref 对象，而不是回调函数。

**官方推荐方式**:
```tsx
const actionRef = useRef<ActionType>();

<ProTable actionRef={actionRef} />
```

**调用方法**:
```tsx
actionRef.current?.reload();        // 刷新表格
actionRef.current?.reloadAndRest(); // 刷新并重置
actionRef.current?.reset();          // 重置表格
```

---

## 13. 工作量评估提示词弹窗两项修复

### 背景
- 在实现“工作量评估 · 提示词模板”弹窗后，控制台出现两个告警：
  1) `[antd: Modal] destroyOnClose is deprecated. Please use destroyOnHidden instead.`
  2) `Instance created by useForm is not connected to any Form element.`

### 修复点
- **修复 1：Modal 废弃属性替换**
  - 现象：使用了 `destroyOnClose` 触发 AntD 废弃警告。
  - 处理：改用 `destroyOnHidden`。
  - 位置：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadPromptSelectorModal.tsx`

- **修复 2：useForm 未关联表单警告**
  - 现象：在表单挂载前从 `form.getFieldValue` 读取值用于“预览”，触发未关联告警。
  - 处理：
    - 使用本地状态 `currentVars` 存储变量值；
    - 在 `<Form onValuesChange>` 回调中同步 `currentVars`；
    - 预览生成改为依赖 `currentVars`，不再直接读取 `form` 实例。
  - 位置：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadPromptSelectorModal.tsx`

### 验收
- 页面不再出现上述两类告警；交互不变，预览随变量变更即时更新。

### 影响范围
- 仅影响“工作量评估 · 提示词模板”弹窗组件；其他 Modal 若仍使用 `destroyOnClose`，可按此方式统一替换。

---

## 14. 模型配置“设为当前”开关异常修复

### 问题
在模型配置表单中，“设为当前使用”开关始终可用，导致当已有当前模型时仍可在新建/编辑其他模型时开启，违背“仅允许一个当前模型”的约束。

### 修复方案
- 前端在加载模型列表时记录当前模型 ID，并传递给表单。
- 表单根据当前模型 ID 判断：
  - 若已有当前模型且本次操作的新建/编辑目标不是当前模型，则禁用“设为当前使用”开关并提示需先取消当前模型。
  - 若不存在当前模型，则允许开启开关。

### 相关改动
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/index.tsx`：请求列表后存储当前模型 ID，并传入表单。
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/components/ModelForm.tsx`：基于当前模型 ID 控制开关禁用状态与提示。
