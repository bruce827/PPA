# 项目评估功能详细规格

**版本**: v1.1  
**最后更新**: 2026-04-11

---

## 1. 功能概述

项目评估模块是系统的核心功能，提供完整的项目成本和风险评估流程。通过分步向导的方式，引导用户完成从风险评估、工作量估算到成本汇总的全过程。

## 2. 功能入口

### 2.1 路由

- **新建评估**: `/assessment/new`
- **编辑评估**: `/assessment/new?edit_id={project_id}`

### 2.2 导航入口

- 左侧菜单：项目评估 → 新建评估
- 历史项目列表：点击"编辑"按钮

## 3. 分步评估流程

### 3.1 流程总览

```
步骤0: 模板选择（可选）
    ↓
步骤1: 风险评分
    ↓
步骤2: 工作量估算
    ↓
步骤3: 其他成本
    ↓
步骤4: 生成总览与保存
```

## 4. 步骤详细设计

### 步骤0: 模板选择（可选）

#### 4.1.1 界面布局

```
┌─────────────────────────────────────────┐
│  从模板创建（可选）                      │
│  ┌────────────────────────────────────┐ │
│  │ 🔽 请选择模板                       │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 4.1.2 功能说明

- **位置**: 页面顶部，在步骤条之前
- **组件**: 下拉选择框（Select）
- **数据源**: 从 `/api/projects?is_template=1` 获取模板列表
- **交互**:
  - 选择模板后，自动填充所有步骤的表单数据
  - 支持清空选择，恢复空表单
  - 模板数据包括：风险评分、工作量记录、其他成本配置

#### 4.1.3 数据加载逻辑

```typescript
// 1. 获取模板列表
const templates = await fetch('/api/projects?is_template=1');

// 2. 用户选择模板
onTemplateSelect(templateId) {
  // 加载模板详情
  const template = await fetch(`/api/projects/${templateId}`);
  
  // 解析并填充表单
  const data = JSON.parse(template.assessment_details_json);
  form.setFieldsValue(data);
}
```

---

### 步骤1: 风险评分

#### 4.2.1 界面布局

```
┌────────────────────────────────────────────┐
│  步骤 1: 风险评分                           │
│                                             │
│  风险类别1                                  │
│  ├─ 评估项1.1  [下拉选择 ▼]                │
│  ├─ 评估项1.2  [下拉选择 ▼]                │
│  └─ 评估项1.3  [下拉选择 ▼]                │
│                                             │
│  风险类别2                                  │
│  ├─ 评估项2.1  [下拉选择 ▼]                │
│  └─ 评估项2.2  [下拉选择 ▼]                │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │ 风险评分总览                        │   │
│  │ • 已评估: 5/5                      │   │
│  │ • 风险总分: 85 / 200              │   │
│  │ • 评分因子: 1.00                  │   │
│  │ • 风险等级: 🟡 中风险              │   │
│  └────────────────────────────────────┘   │
│                                             │
│  [上一步]              [下一步] →          │
└────────────────────────────────────────────┘
```

#### 4.2.2 数据结构

```typescript
// 风险评估项配置（从后端获取）
interface RiskItemConfig {
  id: number;
  category: string;          // 风险类别
  item_name: string;         // 评估项名称
  options_json: string;      // 选项配置（JSON字符串）
  is_active: boolean;
}

// 选项配置解析后的格式
interface RiskOption {
  label: string;   // 选项描述，如"低风险"
  score: number;   // 对应分值，如 2
}

// 用户选择的风险评分
interface RiskScores {
  [risk_item_id: number]: number;  // { 1: 5, 2: 3, ... }
}
```

#### 4.2.3 计算逻辑

```typescript
// 1. 风险总分
const totalScore = Object.values(riskScores).reduce((sum, score) => sum + score, 0);

// 2. 最大可能分值
const maxScore = riskItems.reduce((sum, item) => {
  const options = JSON.parse(item.options_json);
  const maxOption = Math.max(...options.map(opt => opt.score));
  return sum + maxOption;
}, 0);

// 3. 风险比例
const ratio = maxScore > 0 ? totalScore / maxScore : 0;

// 4. 评分因子（按风险比例分段映射，最低为 1.0）
let factor = 1;
if (ratio > 0.7 && ratio <= 1.0) {
  factor = 1 + ((ratio - 0.7) / (1.0 - 0.7)) * 0.2;
} else if (ratio > 1.0) {
  const cappedRatio = Math.min(ratio, 1.2);
  factor = Math.min(1.5, 1.2 + ((cappedRatio - 1.0) / (1.2 - 1.0)) * 0.3);
}

// 5. 风险等级判定
let level = '低风险';
if (ratio >= 0.7) level = '高风险';
else if (ratio >= 0.4) level = '中风险';
```

说明：

- 风险等级用于展示分层
- 评分因子用于成本放缩
- 二者都基于 `风险总分 / 最大可达风险分值`，但用途不同
- 当前口径下，评分因子不会低于 `1.0`

#### 4.2.4 验证规则

- ✅ 所有风险项必须完成评分（不能有未选择的项）
- ✅ 评分总分 ≥ 0
- ⚠️ 如果未完成评分，点击"下一步"时显示提示

---

### 步骤2: 工作量估算

#### 4.3.1 界面布局

```
┌──────────────────────────────────────────────────┐
│  步骤 2: 工作量估算                               │
│                                                   │
│  [新功能开发] [系统对接工作量]                    │
│  ━━━━━━━━━━                                      │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ 一级  │ 二级  │ 三级  │ 说明  │ 交付 │ ... │  │
│  │ 模块  │ 模块  │ 模块  │       │ 系数 │     │  │
│  ├────────────────────────────────────────────┤  │
│  │ [输入]│[输入]│[输入]│[输入]│ 1.0  │角色1│  │
│  │                                    │ 3天 │  │
│  │                              角色2 │ 5天 │  │
│  │                              ...          │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  [+ 添加功能模块]                                 │
│                                                   │
│  [上一步] ←            [下一步] →                │
└──────────────────────────────────────────────────┘
```

#### 4.3.2 数据结构

```typescript
interface WorkloadRecord {
  // 模块信息
  level1_module: string;      // 一级模块名称
  level2_module: string;      // 二级模块名称
  level3_module?: string;     // 三级模块名称（可选）
  description: string;        // 功能说明
  
  // 工作量配置
  delivery_coefficient: number;  // 交付系数，默认 1.0
  role_workdays: {              // 各角色工作天数
    [role_id: number]: number;  // { 1: 3, 2: 5, 3: 2 }
  };
  
  // 计算结果（前端计算）
  total_workdays?: number;      // 总工作天数
  total_cost?: number;          // 模块总成本（万元）
}
```

#### 4.3.3 计算逻辑

```typescript
// 单个模块的工作量和成本计算
function calculateModuleCost(record: WorkloadRecord, roles: RoleConfig[]): number {
  let totalCost = 0;
  
  // 遍历每个角色的工作天数
  for (const [roleId, days] of Object.entries(record.role_workdays)) {
    const role = roles.find(r => r.id === parseInt(roleId));
    if (role && days > 0) {
      // 成本 = 天数 × 日单价 × 交付系数
      const cost = days * role.unit_price * record.delivery_coefficient;
      totalCost += cost;
    }
  }
  
  return totalCost;
}

// 所有模块的汇总
const developmentCost = developmentWorkload.reduce((sum, record) => {
  return sum + calculateModuleCost(record, roles);
}, 0);

const integrationCost = integrationWorkload.reduce((sum, record) => {
  return sum + calculateModuleCost(record, roles);
}, 0);
```

#### 4.3.4 交互说明

**Tab 切换**:
- 新功能开发（默认）
- 系统对接工作量

**添加模块**:
- 点击"+ 添加功能模块"按钮
- 使用 ProTable 的可编辑表格功能
- 支持行内编辑

**角色工作天数**:
- 每个模块可为多个角色分配工作天数
- 动态列显示（根据系统配置的角色生成）
- 输入框自动计算总工时

**删除模块**:
- 每行右侧有删除按钮
- 确认后删除

#### 4.3.5 验证规则

- ⚠️ 至少添加一个模块（新功能开发或系统对接）
- ✅ 一级模块名称必填
- ✅ 工作天数 ≥ 0
- ✅ 交付系数 > 0，默认 1.0

---

### 步骤3: 其他成本

#### 4.4.1 界面布局

```
┌──────────────────────────────────────────┐
│  步骤 3: 其他成本                         │
│                                           │
│  💼 差旅成本                              │
│  ├─ 差旅月数: [____] 月                  │
│  ├─ 差旅人数: [____] 人                  │
│  └─ 预计成本: ¥ 64,800                   │
│      (每人每月 ¥10,800 × 2 人 × 3 月)    │
│                                           │
│  🔧 运维成本                              │
│  ├─ 运维月数: [____] 月                  │
│  ├─ 平均人数: [____] 人                  │
│  └─ 预计成本: ¥ 412,800                  │
│      (6月 × 2人 × 21.5人天/月 × ¥1,600/人天) │
│                                           │
│  ⚠️ 风险成本                              │
│  ┌────────────────────────────────────┐  │
│  │ 风险描述           │ 预估费用（万元）│  │
│  ├────────────────────────────────────┤  │
│  │ [输入框]           │ [输入框]        │  │
│  └────────────────────────────────────┘  │
│  [+ 添加风险项]                          │
│                                           │
│  [上一步] ←            [下一步] →        │
└──────────────────────────────────────────┘
```

#### 4.4.2 数据结构

```typescript
interface OtherCosts {
  // 差旅成本
  travel_months: number;           // 差旅月数
  travel_headcount: number;        // 差旅人数
  travel_cost?: number;            // 自动计算
  
  // 运维成本
  maintenance_months: number;      // 运维月数
  maintenance_headcount: number;   // 运维人数
  maintenance_daily_cost?: number; // 运维日单价（元/人天），默认1600
  maintenance_cost?: number;       // 自动计算
  
  // 风险成本
  risk_items: Array<{
    description: string;           // 风险描述
    estimated_cost: number;        // 预估费用（万元）
  }>;
  risk_cost?: number;             // 自动计算
}
```

#### 4.4.3 计算逻辑

```typescript
// 1. 差旅成本
const travelCostStandard = 10800; // 元/人/月（从配置表获取）
const travelCost = (travel_months * travel_headcount * travelCostStandard) / 10000; // 转为万元

// 2. 运维成本
const maintenanceWorkload = maintenance_months * maintenance_headcount * 21.5;
const maintenanceDailyCost = maintenance_daily_cost || 1600; // 元/人天
const maintenanceCost = (maintenanceWorkload * maintenanceDailyCost) / 10000; // 转为万元

// 3. 风险成本
const riskCost = risk_items.reduce((sum, item) => sum + item.estimated_cost, 0);
```

#### 4.4.4 验证规则

- ✅ 差旅月数 ≥ 0
- ✅ 运维月数 ≥ 0
- ✅ 运维人数 ≥ 0
- ✅ 风险成本 ≥ 0
- ⚠️ 如果输入了差旅月数但为0，给予提示

---

### 步骤4: 生成总览与保存

#### 4.5.1 界面布局

```
┌──────────────────────────────────────────┐
│  步骤 4: 评估总览                         │
│                                           │
│  📊 成本汇总                              │
│  ┌────────────────────────────────────┐  │
│  │ 软件研发成本      │ ¥ 125.50万      │  │
│  │ 系统对接成本      │ ¥  35.20万      │  │
│  │ 差旅成本          │ ¥   3.24万      │  │
│  │ 运维成本          │ ¥   9.00万      │  │
│  │ 风险成本          │ ¥   5.00万      │  │
│  │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│  │
│  │ 报价总计          │ ¥ 177.94万      │  │
│  └────────────────────────────────────┘  │
│                                           │
│  📝 项目信息                              │
│  ├─ 项目名称: [必填] ________________    │
│  ├─ 项目描述: [选填]                     │
│  │   ┌──────────────────────────────┐   │
│  │   │                               │   │
│  │   └──────────────────────────────┘   │
│  └─ □ 另存为模板                         │
│                                           │
│  [上一步] ←     [保存项目] 💾            │
└──────────────────────────────────────────┘
```

#### 4.5.2 数据汇总

```typescript
interface CalculationResult {
  development_cost: number;      // 软件研发成本
  integration_cost: number;      // 系统对接成本
  travel_cost: number;          // 差旅成本
  maintenance_cost: number;     // 运维成本
  risk_cost: number;           // 风险成本
  total_cost: number;          // 总计
  
  // 额外统计
  total_workdays: number;      // 总工作天数
  risk_total_score: number;    // 风险总分
  risk_level: string;          // 风险等级
}
```

#### 4.5.3 保存流程

```typescript
async function saveProject(values: {
  projectName: string;
  projectDescription?: string;
  is_template: boolean;
}) {
  // 1. 准备保存数据
  const payload = {
    name: values.projectName,
    description: values.projectDescription || '',
    is_template: values.is_template,
    final_total_cost: calculationResult.total_cost,
    final_risk_score: riskScoreSummary.total,
    final_workload_days: calculationResult.total_workdays,
    assessment_details_json: JSON.stringify({
      risk_scores: assessmentData.risk_scores,
      development_workload: assessmentData.development_workload,
      integration_workload: assessmentData.integration_workload,
      travel_months: assessmentData.travel_months,
      maintenance_months: assessmentData.maintenance_months,
      maintenance_headcount: assessmentData.maintenance_headcount,
      risk_items: assessmentData.risk_items,
      roles: configData.roles, // 保存角色配置快照
    }),
  };
  
  // 2. 调用API
  if (editId) {
    // 更新已有项目
    await fetch(`/api/projects/${editId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } else {
    // 创建新项目
    await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  
  // 3. 跳转到历史项目页面
  history.push('/assessment/history');
}
```

#### 4.5.4 验证规则

- ✅ 项目名称必填
- ✅ 项目名称长度 ≤ 100 字符
- ⚠️ 如果是模板，提示模板可被其他项目复用

---

## 5. API 接口

### 5.1 获取配置数据

```
GET /api/config/all
```

**响应**:
```json
{
  "data": {
    "roles": [...],
    "risk_items": [...],
    "travel_costs": [...]
  }
}
```

### 5.2 计算成本（可选，目前前端计算）

```
POST /api/calculate
```

**请求体**:
```json
{
  "assessmentData": { ... },
  "roles": [ ... ]
}
```

**响应**:
```json
{
  "data": {
    "development_cost": 125.5,
    "integration_cost": 35.2,
    ...
  }
}
```

### 5.3 保存项目

```
POST /api/projects
PUT /api/projects/:id
```

**请求体**: 见步骤4保存流程

---

## 6. 异常处理

### 6.1 网络错误

- 显示友好的错误提示
- 提供重试按钮
- 保留用户已输入的数据

### 6.2 数据验证失败

- 高亮显示错误字段
- 显示具体错误原因
- 阻止进入下一步

### 6.3 保存失败

- 显示错误信息
- 不跳转页面
- 允许用户修改后重试

---

## 7. 性能优化

### 7.1 数据加载

- 配置数据只加载一次
- 使用 React.useMemo 缓存计算结果
- 避免不必要的重新渲染

### 7.2 表单性能

- 大型表格使用虚拟滚动
- 防抖输入事件
- 按需渲染列

---

## 8. 用户体验优化

### 8.1 步骤导航

- 步骤条显示当前进度
- 支持点击步骤条快速跳转（已完成的步骤）
- 最后一步显示"完成"标识

### 8.2 数据保留

- 在步骤间切换时保留已填写的数据
- 编辑模式自动加载项目数据
- 模板选择后可清空重填

### 8.3 视觉反馈

- 实时显示风险评分统计
- 实时显示成本汇总
- 加载状态使用 Skeleton 占位符

---

**文档结束**
