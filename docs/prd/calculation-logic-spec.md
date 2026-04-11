# 项目报价计算逻辑技术文档

**文档版本**: v1.1  
**最后更新**: 2026-04-11  
**适用范围**: 项目评估系统 (PPA) - 标准评估实时计算与项目保存复算

---

## 1. 概述

本文档详细说明项目评估系统中"计算最新报价"功能的计算逻辑，包括前端调用流程、后端计算算法、数据结构和公式推导。

### 1.1 功能位置
- **页面**: `/assessment/new` (新建评估)
- **步骤**: 第4步 - 生成总览
- **组件**: `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`
- **API**: `POST /api/calculate`
- **后端实现**:
  - `server/controllers/calculationController.js`
  - `server/services/calculationService.js`
  - `server/utils/rating.js`

### 1.2 业务目标
根据用户在前三个步骤中填写的：
1. **风险评分** (步骤1)
2. **工作量估算** (步骤2: 新功能开发 + 系统对接)
3. **其他成本** (步骤3: 差旅、运维、风险成本)

自动计算出项目的各项成本明细和报价总额。

---

## 2. 数据流程

### 2.1 前端调用流程

```typescript
// Overview.tsx - handleCalculate 函数
const handleCalculate = async () => {
  try {
    // 1. 构造请求参数
    const payload: API.CalculateParams = {
      ...assessmentData,        // 包含步骤1-3的所有数据
      roles: configData.roles,  // 角色配置（含单价）
    };
    
    // 2. 调用计算API
    const result = await calculateProjectCost(payload);
    
    // 3. 保存并展示计算结果
    setCalculationResult(result.data);
    message.success('报价计算成功');
  } catch (error) {
    console.error('计算报价失败:', error);
    message.error('计算报价失败，请检查输入数据');
  }
};
```

### 2.2 请求参数结构 (API.CalculateParams)

```typescript
{
  // 步骤1: 风险评分
  risk_scores: {
    "风险项名称1": 分值1,
    "风险项名称2": 分值2,
    ...
  },
  
  // 步骤2: 新功能开发工作量
  development_workload: [
    {
      id: "唯一标识",
      module1: "一级模块",
      module2: "二级模块",
      module3: "三级模块",
      description: "功能描述",
      delivery_factor: 1.0,      // 交付系数
      scope_factor: 1.0,         // 范围系数
      tech_factor: 1.0,          // 技术系数
      "产品经理": 3,             // 各角色工作日数
      "开发工程师": 10,
      "测试工程师": 5,
      ...
    },
    ...
  ],
  
  // 步骤2: 系统对接工作量
  integration_workload: [
    {
      id: "唯一标识",
      system_name: "对接系统名称",
      description: "对接描述",
      delivery_factor: 1.0,
      scope_factor: 1.0,
      tech_factor: 1.0,
      "产品经理": 2,
      "开发工程师": 8,
      ...
    },
    ...
  ],
  
  // 步骤3: 其他成本
  travel_months: 2,              // 差旅月数
  travel_headcount: 2,           // 每月差旅人数（新增）
  maintenance_months: 12,        // 运维月数
  maintenance_headcount: 2,      // 运维每月投入人数
  maintenance_daily_cost: 1600,  // 运维人员日成本（元/天，可配置，默认1600）
  risk_items: [                  // 风险成本列表
    { id: 1, content: "风险内容", cost: 5 },
    ...
  ],
  
  // 角色配置
  roles: [
    { id: 1, role_name: "产品经理", unit_price: 1800 },
    { id: 2, role_name: "开发工程师", unit_price: 1600 },
    ...
  ]
}
```

### 2.3 响应结果结构 (API.CalculationResult)

```typescript
{
  data: {
    software_dev_cost: 150,          // 软件研发成本 (万元)
    system_integration_cost: 80,     // 系统对接成本 (万元)
    travel_cost: 2,                  // 差旅成本 (万元)
    maintenance_cost: 82,            // 运维成本 (万元)
    risk_cost: 10,                   // 风险成本 (万元)
    total_cost: 324,                 // 报价总计 (万元)
  }
}
```

---

## 3. 后端计算逻辑详解

### 3.1 核心算法架构

后端计算分为 **4个主要步骤**：

```
输入数据
   ↓
步骤1: 计算评分因子 (ratingFactor)
   ↓
步骤2: 计算工作量成本 (软件研发 + 系统对接)
   ↓
步骤3: 计算其他成本 (差旅 + 运维 + 风险)
   ↓
步骤4: 汇总并取整
   ↓
返回结果
```

---

### 3.2 步骤1: 计算评分因子

#### 3.2.1 风险总分计算

```javascript
const configRiskScore = Object.values(assessmentData.risk_scores || {})
  .reduce((sum, score) => sum + Number(score), 0);

const aiUnmatchedRiskScore = (assessmentData.ai_unmatched_risks || [])
  .reduce((sum, item) => sum + Number(item.score || 0), 0);

const customRiskScore = (assessmentData.custom_risk_items || [])
  .reduce((sum, item) => sum + Number(item.score || 0), 0);

const riskScore = configRiskScore + aiUnmatchedRiskScore + customRiskScore;
```

**说明**:
- 当前总风险分是三类来源的汇总：
  - 配置化风险项 `risk_scores`
  - AI 未匹配风险项 `ai_unmatched_risks`
  - 自定义风险项 `custom_risk_items`
- 示例: 如果配置化风险项合计 80 分，AI 未匹配补充 5 分，自定义补充 3 分，则 `riskScore = 88`

#### 3.2.2 评分因子计算

```javascript
const ratio = maxScore > 0 ? riskScore / maxScore : 0;

let ratingFactor = 1;
if (ratio > 0.7 && ratio <= 1.0) {
  ratingFactor = 1 + ((ratio - 0.7) / (1.0 - 0.7)) * 0.2;
} else if (ratio > 1.0) {
  const cappedRatio = Math.min(ratio, 1.2);
  ratingFactor = Math.min(1.5, 1.2 + ((cappedRatio - 1.0) / (1.2 - 1.0)) * 0.3);
}
```

**公式**:
$$
\text{ratio} = \frac{\text{风险总分}}{\text{最大可达风险分值}}
$$

$$
\text{ratingFactor} =
\begin{cases}
1.0, & ratio \le 0.7 \\
1.0 + \frac{ratio - 0.7}{1.0 - 0.7} \times 0.2, & 0.7 < ratio \le 1.0 \\
\min\left(1.5,\ 1.2 + \frac{\min(ratio, 1.2) - 1.0}{1.2 - 1.0} \times 0.3\right), & ratio > 1.0
\end{cases}
$$

**作用**:
- 将风险得分映射为成本放缩因子
- 因子最低为 `1.0`，不会因为低风险而把成本压到 1 以下
- 风险越高，系数越大，最高封顶 `1.5`
- 示例: `riskScore = 88`、`maxScore = 100` → `ratio = 0.88` → `ratingFactor = 1.12`

**业务意义**:
- 低到中风险区间 (`ratio <= 0.7`)：维持基准系数 `1.0`
- 高风险接近满分区间 (`0.7 < ratio <= 1.0`)：系数线性抬升到 `1.2`
- 超配或附加风险区间 (`1.0 < ratio <= 1.2`)：继续抬升到 `1.5`
- 超过 `1.2` 的部分不再继续放大，避免极端报价失控

---

### 3.3 步骤2: 工作量成本计算

这是整个计算逻辑中最复杂的部分，需要分别计算 **新功能开发成本** 和 **系统对接成本**。

#### 3.3.1 通用工作量计算函数

```javascript
const calculateWorkloadCost = (workloadItems, roles) => {
  let totalWorkload = 0;      // 累计总工作量 (人天)
  let totalCost = 0;          // 累计总成本 (万元)
  
  // 1. 构建角色单价映射表
  const rolePriceMap = new Map(
    roles.map(r => [r.role_name, r.unit_price / 10000])
  );
  // 示例: {"产品经理": 0.18, "开发工程师": 0.16}
  
  // 2. 遍历每一条工作量记录
  workloadItems.forEach(item => {
    let itemRoleCost = 0;     // 该条记录的角色成本
    let itemRoleDays = 0;     // 该条记录的角色工作日总和
    
    // 3. 累加各角色的工作日和成本
    roles.forEach(role => {
      const days = Number(item[role.role_name] || 0);
      itemRoleDays += days;
      itemRoleCost += days * (rolePriceMap.get(role.role_name) || 0);
    });
    
    // 4. 计算该条记录的实际工作量 (考虑交付系数)
    const workload = itemRoleDays * Number(item.delivery_factor || 1);
    
    // 5. 计算该条记录的最终成本 (应用所有系数)
    const cost = itemRoleCost 
      * Number(item.delivery_factor || 1)   // 交付系数
      * ratingFactor                         // 评分因子
      * (item.scope_factor || 1)             // 范围系数
      * (item.tech_factor || 1);             // 技术系数
    
    totalWorkload += workload;
    totalCost += cost;
  });
  
  return { totalWorkload, totalCost };
};
```

#### 3.3.2 成本计算公式详解

对于每一条工作量记录：

**1️⃣ 基础角色成本计算**

$$
\text{itemRoleCost} = \sum_{i=1}^{n} (\text{days}_i \times \text{unitPrice}_i)
$$

其中:
- $n$ = 角色数量
- $\text{days}_i$ = 该角色的工作日数
- $\text{unitPrice}_i$ = 该角色的日单价 (万元)

**示例**:
```
角色: 产品经理 3天 (0.18万/天) + 开发工程师 10天 (0.16万/天)
itemRoleCost = 3 × 0.18 + 10 × 0.16 = 0.54 + 1.6 = 2.14 万元
```

**2️⃣ 最终成本计算**

$$
\text{cost} = \text{itemRoleCost} \times \text{deliveryFactor} \times \text{ratingFactor} \times \text{scopeFactor} \times \text{techFactor}
$$

**系数说明**:

| 系数名称 | 字段名 | 默认值 | 作用 |
|---------|--------|--------|------|
| 交付系数 | delivery_factor | 1.0 | 反映交付压力 (紧急程度) |
| 评分因子 | ratingFactor | 动态 | 项目整体风险级别 |
| 范围系数 | scope_factor | 1.0 | 反映需求变更可能性 |
| 技术系数 | tech_factor | 1.0 | 反映技术难度和风险 |

**示例**:
```
基础成本: 2.14万
交付系数: 1.2 (紧急项目)
评分因子: 1.12 (风险比例0.88)
范围系数: 1.1 (需求可能变更)
技术系数: 1.05 (有一定技术难度)

最终成本 = 2.14 × 1.2 × 1.12 × 1.1 × 1.05 = 3.167 万元
```

**3️⃣ 工作量计算**

$$
\text{workload} = \sum_{i=1}^{n} \text{days}_i \times \text{deliveryFactor}
$$

**示例**:
```
总工作日: 13天 (产品3 + 开发10)
交付系数: 1.2
实际工作量 = 13 × 1.2 = 15.6 人天
```

#### 3.3.3 应用到两类工作量

```javascript
// 新功能开发成本
const dev = calculateWorkloadCost(
  assessmentData.development_workload || [], 
  assessmentData.roles || [],
  ratingFactor
);

// 系统对接成本
const integration = calculateWorkloadCost(
  assessmentData.integration_workload || [], 
  assessmentData.roles || [],
  ratingFactor
);
```

**结果**:
- `dev.totalCost` → 软件研发成本
- `integration.totalCost` → 系统对接成本

---

### 3.4 步骤3: 其他成本计算

#### 3.4.1 差旅成本

```javascript
// 从配置表汇总所有差旅成本项（元/人/月）
const travelCostPerMonth = await new Promise((resolve, reject) => {
  db.get('SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1', [], (err, row) => {
    if (err) reject(err); else resolve(row?.total || 10800); // 默认10800元/人/月
  });
});

// 差旅成本（万元） = 差旅月数 × 每月差旅人数 × (每人每月差旅费用 ÷ 10000)
const travelCost = (assessmentData.travel_months || 0)
  * (assessmentData.travel_headcount || 0)
  * (travelCostPerMonth / 10000);
```

**公式**:  
$$
	ext{差旅成本(万元)} = \text{差旅月数} \times \text{每月差旅人数} \times \frac{\text{每人每月差旅费用(元/人/月)}}{10000}
$$

**说明**:
- 每人每月差旅费用来源：`config_travel_costs` 表所有启用项之和 (市内通勤+住宿+餐补+出差补助 = 10800元/人/月)
- 增加了差旅人数维度，更贴合真实场景
- 单位换算：元 → 万元（除以10000）

**示例**:
```
差旅月数 = 3 个月
差旅人数 = 2 人
每人每月差旅费用合计 = 10800 元/人/月
差旅成本 = 3 × 2 × (10800 / 10000) = 6.48 万元 → 四舍五入 = 6 万元 (展示层取整)
```

#### 3.4.2 运维成本

```javascript
// 运维工作量（人天）
const maintenanceWorkload = (assessmentData.maintenance_months || 0)
  * (assessmentData.maintenance_headcount || 0)
  * 21.5; // 平均每月工作日

// 运维人员每日成本（元/天，前端表单填写，默认1600）
const maintenanceDailyCost = assessmentData.maintenance_daily_cost || 1600;

// 运维成本（万元） = 运维工作量 × (每日成本 ÷ 10000)
const maintenanceCost = maintenanceWorkload * (maintenanceDailyCost / 10000);
```

**公式**:
$$
	ext{运维工作量(人天)} = \text{运维月数} \times \text{平均每月运维人数} \times 21.5
$$
$$
	ext{运维成本(万元)} = \text{运维工作量} \times \frac{\text{运维人员每日成本(元/天)}}{10000}
$$

**说明**:
- 运维人员每日成本由用户在表单中填写，默认 1600 元/天（即 0.16 万元/天）
- 将原硬编码 0.16 替换为可配置变量 `maintenance_daily_cost`
- 保留 21.5 作为行业标准月工作日基准

**示例**:
```
运维 12 个月，每月 2 人，每日成本 1600 元
工作量 = 12 × 2 × 21.5 = 516 人天
运维成本 = 516 × (1600 / 10000) = 516 × 0.16 = 82.56 万元 → 展示取整 83 万元
```

#### 3.4.3 风险成本

```javascript
const riskCost = (assessmentData.risk_items || [])
  .reduce((sum, item) => sum + Number(item.cost || 0), 0);
```

**公式**:
$$
\text{风险成本} = \sum_{i=1}^{m} \text{riskItem}_i.\text{cost}
$$

**说明**:
- 直接累加用户在步骤3中填写的各项风险成本
- 示例: [5万, 3万, 2万] → 总计 10万元

---

### 3.5 步骤4: 汇总并取整

```javascript
// 1. 计算精确总成本
const totalExactCost = 
  dev.totalCost 
  + integration.totalCost 
  + travelCost 
  + maintenanceCost 
  + riskCost;

// 2. 构造返回结果 (四舍五入到整数)
const result = {
  software_dev_cost: Math.round(dev.totalCost),
  system_integration_cost: Math.round(integration.totalCost),
  travel_cost: Math.round(travelCost),
  maintenance_cost: Math.round(maintenanceCost),
  risk_cost: Math.round(riskCost),
  total_cost: Math.round(totalExactCost),
};

res.json({ data: result });
```

**取整策略**:
- 使用 `Math.round()` 四舍五入到整数万元
- 避免小数点导致的显示不友好

---

## 4. 完整计算示例

### 4.1 输入数据

```json
{
  "risk_scores": {
    "业务复杂度": 10,
    "技术难度": 12,
    "团队经验": 8,
    "时间压力": 15,
    "需求稳定性": 9,
    "外部依赖": 11,
    "数据安全": 13,
    "集成复杂度": 10
  },
  "development_workload": [
    {
      "id": "1",
      "module1": "用户管理",
      "module2": "用户注册",
      "description": "邮箱注册+验证",
      "delivery_factor": 1.0,
      "scope_factor": 1.0,
      "tech_factor": 1.0,
      "产品经理": 2,
      "开发工程师": 5,
      "测试工程师": 3
    },
    {
      "id": "2",
      "module1": "订单管理",
      "module2": "订单创建",
      "description": "支持多商品下单",
      "delivery_factor": 1.2,
      "scope_factor": 1.1,
      "tech_factor": 1.05,
      "产品经理": 3,
      "开发工程师": 10,
      "测试工程师": 5
    }
  ],
  "integration_workload": [
    {
      "id": "3",
      "system_name": "支付系统",
      "description": "对接支付宝",
      "delivery_factor": 1.0,
      "scope_factor": 1.0,
      "tech_factor": 1.2,
      "开发工程师": 8,
      "测试工程师": 4
    }
  ],
  "travel_months": 2,
  "maintenance_months": 12,
  "maintenance_headcount": 2,
  "risk_items": [
    { "id": 1, "content": "第三方API不稳定", "cost": 5 },
    { "id": 2, "content": "数据迁移风险", "cost": 3 }
  ],
  "roles": [
    { "id": 1, "role_name": "产品经理", "unit_price": 1800 },
    { "id": 2, "role_name": "开发工程师", "unit_price": 1600 },
    { "id": 3, "role_name": "测试工程师", "unit_price": 1400 }
  ]
}
```

### 4.2 计算过程

#### **第1步: 评分因子**
```
风险总分 = 10+12+8+15+9+11+13+10 = 88
最大可达风险分值 = 100
风险比例 = 88 / 100 = 0.88
评分因子 = 1 + ((0.88 - 0.7) / 0.3) × 0.2 = 1.12
```

#### **第2步: 软件研发成本**

**记录1: 用户注册**
```
角色成本 = 2×0.18 + 5×0.16 + 3×0.14 = 0.36 + 0.8 + 0.42 = 1.58万
最终成本 = 1.58 × 1.0 × 1.12 × 1.0 × 1.0 = 1.77万
```

**记录2: 订单创建**
```
角色成本 = 3×0.18 + 10×0.16 + 5×0.14 = 0.54 + 1.6 + 0.7 = 2.84万
最终成本 = 2.84 × 1.2 × 1.12 × 1.1 × 1.05 = 4.41万
```

**软件研发总成本 = 1.77 + 4.41 = 6.18万**

#### **第3步: 系统对接成本**

**记录3: 支付系统对接**
```
角色成本 = 8×0.16 + 4×0.14 = 1.28 + 0.56 = 1.84万
最终成本 = 1.84 × 1.0 × 1.12 × 1.0 × 1.2 = 2.47万
```

**系统对接总成本 = 2.47万**

#### **第4步: 其他成本**
```
差旅成本 = 2(月) × 2(人) × (10800 ÷ 10000) = 4.32万
运维工作量 = 12 × 2 × 21.5 = 516人天
运维成本 = 516 × (1600 ÷ 10000) = 82.56万
风险成本 = 5 + 3 = 8万
```

#### **第5步: 总计**
```
精确总价 = 6.18 + 2.47 + 4.32 + 82.56 + 8 = 103.53万
展示总价 = round(103.53) = 104万
```

### 4.3 输出结果

```json
{
  "data": {
    "software_dev_cost": 6.18,
    "system_integration_cost": 2.47,
    "travel_cost": 4.32,
    "maintenance_cost": 82.56,
    "risk_cost": 8,
    "total_cost_exact": 103.53,
    "total_cost": 104,
    "risk_score": 88,
    "rating_factor": 1.12,
    "rating_ratio": 0.88,
    "risk_max_score": 100
  }
}
```

---

## 5. 前端展示逻辑

### 5.1 展示组件

```typescript
// Overview.tsx
{calculationResult && (
  <Descriptions bordered>
    <Descriptions.Item label="软件研发成本" span={3}>
      <Statistic value={calculationResult.software_dev_cost} suffix="万元" />
    </Descriptions.Item>
    <Descriptions.Item label="系统对接成本" span={3}>
      <Statistic value={calculationResult.system_integration_cost} suffix="万元" />
    </Descriptions.Item>
    <Descriptions.Item label="差旅成本" span={3}>
      <Statistic value={calculationResult.travel_cost} suffix="万元" />
    </Descriptions.Item>
    <Descriptions.Item label="运维成本" span={3}>
      <Statistic value={calculationResult.maintenance_cost} suffix="万元" />
    </Descriptions.Item>
    <Descriptions.Item label="风险成本" span={3}>
      <Statistic value={calculationResult.risk_cost} suffix="万元" />
    </Descriptions.Item>
    <Descriptions.Item label="报价总计" span={3}>
      <Statistic 
        value={calculationResult.total_cost} 
        suffix="万元" 
        valueStyle={{ color: '#cf1322' }} 
      />
    </Descriptions.Item>
  </Descriptions>
)}
```

### 5.2 交互流程

```
用户点击"计算最新报价"
      ↓
前端调用 POST /api/calculate
      ↓
显示加载状态
      ↓
后端返回计算结果
      ↓
更新 calculationResult 状态
      ↓
显示成功提示: "报价计算成功"
      ↓
渲染成本明细表格
      ↓
显示保存项目表单
```

---

## 6. 数据一致性保证

### 6.1 计算逻辑复用

在 `server/services/projectService.js` 的项目创建与更新流程中，**后端会重新执行完整的计算逻辑**，而不是直接使用前端传来的计算结果。

```javascript
const normalizedAssessment = normalizeAssessmentData(assessmentData);
const calculation = await calculationService.calculateProjectCost(normalizedAssessment);

const dbData = {
  name,
  description,
  is_template,
  final_total_cost: calculation.total_cost,
  final_risk_score: calculation.risk_score,
  final_workload_days: calculation.total_workload_days,
  assessment_details_json: JSON.stringify(normalizedAssessment),
};

await projectModel.createProject(dbData);
```

**为什么要重新计算？**
1. **安全性**: 防止前端篡改数据
2. **一致性**: 确保入库数据与计算逻辑一致
3. **可审计**: 后端日志可追溯完整计算过程

### 6.2 数据验证

**前端验证**:
- ProForm 字段级验证 (必填、数值范围)
- 步骤间数据完整性检查

**后端验证**:
- 数值类型转换 (`Number()`)
- 空值处理 (`|| 0`, `|| 1`)
- 异常捕获 (`try-catch`)

---

## 7. 已知问题与改进建议

### 7.1 硬编码常量

**问题**:
```javascript
const travelCost = (assessmentData.travel_months || 0) * 1.08;  // ❌ 硬编码
const maintenanceCost = maintenanceWorkload * 0.16;             // ❌ 硬编码
```

**改进方案**:
```javascript
// 从数据库配置表读取
db.get("SELECT cost_per_month FROM config_travel_costs WHERE item_name = '标准差旅'", (err, row) => {
  const travelUnitCost = row?.cost_per_month / 10000 || 1.08;
  const travelCost = assessmentData.travel_months * travelUnitCost;
});
```

### 7.2 评分因子设计现状

**当前实现**:
- 评分因子不再使用 `风险总分 / 100`
- 当前采用“风险比例 + 分段插值 + 1.5 封顶”的方式
- 风险比例分母来自配置化风险项的最大可达分值总和

**当前收益**:
- 避免低风险项目把系数压到 `1` 以下
- 在高风险区间保持平滑抬升，而不是突然跳变
- 当存在额外风险项时，仍能通过比例和封顶机制保持可解释性

**后续可调参数**:
- 基准阈值 `0.7`
- 中位阈值 `1.0`
- 峰值阈值 `1.2`
- 中位因子 `1.2`
- 封顶因子 `1.5`

### 7.3 四舍五入时机

**问题**:
- 当前在最后统一取整
- 可能导致误差累积

**改进方案**:
```javascript
// 选项1: 保留2位小数
value: calculationResult.total_cost.toFixed(2)

// 选项2: 分项取整后再求和
const total = Math.round(dev) + Math.round(integration) + ...;
```

### 7.4 工作量未返回

**问题**:
- 计算了 `totalWorkload`，但未返回给前端
- API.CalculationResult 中定义了 `total_workload` 字段，但未使用

**改进方案**:
```javascript
const result = {
  software_dev_cost: Math.round(dev.totalCost),
  software_dev_workload: Math.round(dev.totalWorkload),  // ✅ 新增
  system_integration_cost: Math.round(integration.totalCost),
  system_integration_workload: Math.round(integration.totalWorkload),  // ✅ 新增
  // ...
  total_cost: Math.round(totalExactCost),
  total_workload: Math.round(dev.totalWorkload + integration.totalWorkload + maintenanceWorkload),  // ✅ 新增
};
```

---

## 8. 测试建议

### 8.1 单元测试用例

**用例1: 零值输入**
```json
输入: 所有字段为0或空数组
预期输出: 所有成本为0
```

**用例2: 最小有效输入**
```json
输入: risk_scores = {item1: 100}, 其他为空
预期输出: total_cost = 0 (无工作量)
```

**用例3: 高风险项目**
```json
输入: 风险总分 = 200
预期输出: 成本是基准的2倍
```

**用例4: 复杂系数组合**
```json
输入: delivery_factor=1.5, scope_factor=1.2, tech_factor=1.1
预期输出: 成本 = 基础成本 × 1.5 × 1.2 × 1.1 × ratingFactor
```

### 8.2 集成测试

**测试流程**:
1. 填写完整的4步骤数据
2. 点击"计算最新报价"
3. 验证返回结果与手工计算一致
4. 保存项目
5. 查询数据库，验证 `final_total_cost` 与计算结果一致

### 8.3 边界测试

- 极大值: 工作量10000人天
- 极小值: 0.01人天
- 负数: 应被转换为0
- 字符串: 应被转换为数字或0
- 缺失字段: 应使用默认值

---

## 9. 附录

### 9.1 相关文件清单

| 文件路径 | 说明 |
|---------|------|
| `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx` | 前端计算触发组件 |
| `frontend/ppa_frontend/src/services/assessment/index.ts` | 前端API调用定义 |
| `frontend/ppa_frontend/src/services/assessment/typings.d.ts` | TypeScript类型定义 |
| `server/controllers/calculationController.js` | 后端计算接口入口 |
| `server/services/calculationService.js` | 后端计算逻辑实现 |
| `server/services/projectService.js` | 项目保存时的后端复算 |
| `server/utils/rating.js` | 风险比例与评分因子映射 |

### 9.2 数据库表结构

**config_roles** (角色配置)
```sql
CREATE TABLE config_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL  -- 日单价 (元)
);
```

**config_travel_costs** (差旅成本配置)
```sql
CREATE TABLE config_travel_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  cost_per_month REAL NOT NULL  -- 月单价 (元)
);
```

**projects** (项目表)
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  is_template INTEGER DEFAULT 0,
  final_total_cost INTEGER,          -- 报价总额 (万元)
  final_risk_score INTEGER,          -- 风险总分
  final_workload_days REAL,          -- 总工作量 (人天)
  assessment_details_json TEXT,      -- 完整评估数据 (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.3 公式速查表

| 计算项 | 公式 |
|-------|------|
| 风险比例 | `riskScore / riskMaxScore` |
| 评分因子 | `ratio <= 0.7 -> 1.0；0.7~1.0 线性增至 1.2；1.0~1.2 线性增至 1.5 并封顶` |
| 角色成本 | `Σ(天数 × 日单价)` |
| 工作量 | `总天数 × 交付系数` |
| 单项成本 | `角色成本 × 交付系数 × 评分因子 × 范围系数 × 技术系数` |
| 差旅成本 | `差旅月数 × 差旅人数 × (每人每月差旅费用 ÷ 10000)` |
| 运维工作量 | `运维月数 × 平均每月运维人数 × 21.5` |
| 运维成本 | `运维工作量 × (运维每日成本 ÷ 10000)` |
| 风险成本 | `Σ(风险项金额)` |
| 报价总计 | `软件研发 + 系统对接 + 差旅 + 运维 + 风险` |

---

## 10. 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| v1.1 | 2026-04-11 | Codex | 修正评分因子口径与日单价描述，回填当前实现 |
| v1.0 | 2025-10-21 | System | 初始版本，完整记录计算逻辑 |

---

**文档结束**
