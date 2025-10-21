# 计算逻辑改进待办清单

**创建日期**: 2025-10-21  
**相关文档**: [calculation-logic-spec.md](./calculation-logic-spec.md)  
**优先级定义**: 🔴 高优先级 | 🟡 中优先级 | 🟢 低优先级

---

## 待办事项概览

| 编号 | 问题 | 优先级 | 状态 | 预估工作量 |
|------|------|--------|------|-----------|
| TODO-1 | 差旅成本硬编码 | 🟡 中 | ✅ 已完成 | 2小时 → 1小时 |
| TODO-2 | 运维成本单价硬编码 | 🟡 中 | ⏸️ 待讨论 | 1小时 |
| TODO-3 | 评分因子计算逻辑优化 | 🔴 高 | ⏸️ 待讨论 | 3小时 |
| TODO-4 | 四舍五入时机优化 | 🟢 低 | ⏸️ 待讨论 | 1小时 |
| TODO-5 | 工作量数据返回前端 | 🟡 中 | ⏸️ 待讨论 | 2小时 |

---

## TODO-1: 差旅成本配置化

### 当前问题
```javascript
// server/index.js - POST /api/calculate
const travelCost = (assessmentData.travel_months || 0) * 1.08;  // ❌ 硬编码
```

**问题分析**:
- 差旅单价 `1.08万/月` 硬编码在代码中
- 如果差旅成本变化，需要修改代码重新部署
- 无法支持不同类型的差旅成本（如国内/国际）

### 改进方案

#### 方案A: 单一配置项 (简单)
从 `config_travel_costs` 表读取标准差旅单价

**优点**:
- 实现简单，修改量小
- 符合当前表结构

**缺点**:
- 只支持单一差旅成本标准
- 无法区分差旅类型

**实现代码**:
```javascript
// 1. 先查询配置
db.get(
  "SELECT cost_per_month FROM config_travel_costs WHERE item_name = '标准差旅'", 
  (err, row) => {
    const travelUnitCost = row?.cost_per_month / 10000 || 1.08;
    const travelCost = assessmentData.travel_months * travelUnitCost;
    // ... 继续计算
  }
);
```

#### 方案B: 多类型差旅 (复杂)
前端支持选择差旅类型（国内/国际/远程）

**优点**:
- 灵活性高
- 更精确

**缺点**:
- 需要修改前端表单
- 需要修改数据结构
- 复杂度增加

**数据结构调整**:
```typescript
// 前端数据结构
type AssessmentData = {
  // 原: travel_months: number;
  travel_items: Array<{
    type: 'domestic' | 'international' | 'remote';
    months: number;
  }>;
}
```

### 讨论问题
1. ~~是否需要多类型差旅？~~ **已决定：采用方案A升级版**
2. ~~配置位置~~：**已实现：从config_travel_costs表SUM查询**
3. ~~兼容性~~：**已处理：默认值10800元向后兼容**

### 实施方案
✅ **已采用：方案A升级版（求和所有差旅成本项）**
- 从 `config_travel_costs` 表查询所有 `is_active = 1` 的成本项求和
- 支持差旅成本管理模块灵活配置（市内通勤、住宿、餐补、出差补助等）
- 默认值10800元/月保证向后兼容

### 实施记录
**完成时间**: 2025-10-21  
**修改文件**: `server/index.js`  
**修改内容**:
1. POST `/api/calculate` 端点（第247-260行）
2. POST `/api/projects` 端点（第316-329行）

**实现代码**:
```javascript
// 从配置表查询所有差旅成本项的总和（元/人/月）
const travelCostPerMonth = await new Promise((resolve, reject) => {
  db.get(
    'SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1',
    [],
    (err, row) => {
      if (err) reject(err);
      else resolve(row?.total || 10800); // 默认值10800元/月（向后兼容）
    }
  );
});
const travelCost = (assessmentData.travel_months || 0) * (travelCostPerMonth / 10000); // 转换为万元
```

**业务逻辑**:
- 差旅成本 = 差旅月数 × (所有启用的差旅成本项之和 ÷ 10000)
- 单位：万元
- 数据来源：`config_travel_costs` 表（市内通勤1500 + 住宿6000 + 餐补900 + 出差补助2400 = 10800元/月）

---

## TODO-2: 运维成本单价配置化

### 当前问题
```javascript
// server/index.js - POST /api/calculate
const maintenanceCost = maintenanceWorkload * 0.16;  // ❌ 硬编码
```

**问题分析**:
- 运维人员日单价 `0.16万` 硬编码
- 实际运维单价可能随角色/经验变化

### 改进方案

#### 方案A: 统一运维单价 (简单)
添加一个系统级配置项

**实现**:
```javascript
// 方式1: 新增配置表 config_system_params
CREATE TABLE config_system_params (
  param_key TEXT PRIMARY KEY,
  param_value REAL,
  description TEXT
);

INSERT INTO config_system_params VALUES 
  ('maintenance_unit_price', 1600, '运维人员日单价（元）');

// 方式2: 使用现有 config_roles 表
// 假设有"运维工程师"角色，直接取其单价
```

#### 方案B: 按角色计算运维成本 (复杂)
前端选择运维人员角色组成

**优点**:
- 更精确反映实际成本
- 复用角色配置

**缺点**:
- 前端表单复杂化
- 用户填写成本高

**数据结构**:
```typescript
type AssessmentData = {
  // 原: maintenance_headcount: number;
  maintenance_roles: Array<{
    role_name: string;
    headcount: number;
  }>;
}
```

### 讨论点
1. **运维团队构成**：实际运维是否有不同角色（如初级/高级）？
2. **简化 vs 精确**：是否值得为精确性牺牲易用性？
3. **历史数据兼容**：已保存项目如何迁移？

### 推荐方案
🎯 **建议采用方案A（统一单价）+ 新增配置表**
- 创建 `config_system_params` 存储系统级参数
- 支持在配置页面修改
- 保持前端表单简洁

---

## TODO-3: 评分因子计算逻辑优化 ⚠️ 重要

### 当前问题
```javascript
const ratingFactor = riskScore / 100;
```

**业务逻辑问题**:
```
风险总分 = 60  → 系数 = 0.6 → 报价降低 40% ❌ 不合理
风险总分 = 100 → 系数 = 1.0 → 基准报价
风险总分 = 150 → 系数 = 1.5 → 报价提高 50%
```

**问题本质**:
- 低风险项目报价反而降低，违反常识
- 应该是：低风险 = 基准报价，高风险 = 报价上浮

### 改进方案

#### 方案A: 分段线性映射
```javascript
const ratingFactor = 
  riskScore < 80  ? 1.0  :  // 低风险：基准价
  riskScore < 100 ? 1.0 + (riskScore - 80) * 0.01  :  // 80-100: 1.0-1.2
  riskScore < 120 ? 1.2 + (riskScore - 100) * 0.015 :  // 100-120: 1.2-1.5
                    1.5;  // 高风险：封顶1.5倍
```

**映射关系**:
| 风险总分 | 系数 | 报价调整 |
|---------|------|---------|
| 0-80 | 1.0 | 基准价 |
| 80 | 1.0 | 基准价 |
| 90 | 1.1 | +10% |
| 100 | 1.2 | +20% |
| 110 | 1.35 | +35% |
| 120+ | 1.5 | +50% (封顶) |

#### 方案B: 非线性映射（指数）
```javascript
const ratingFactor = Math.min(
  1.5,  // 封顶
  1.0 + Math.pow((riskScore - 80) / 100, 1.5)
);
```

**特点**:
- 风险增长，系数加速增长
- 更符合风险影响的非线性特征

#### 方案C: 可配置分段
在配置表中定义分段规则

```sql
CREATE TABLE config_rating_rules (
  id INTEGER PRIMARY KEY,
  score_min INTEGER,
  score_max INTEGER,
  factor_base REAL,
  factor_increment REAL
);

-- 示例数据
INSERT INTO config_rating_rules VALUES
  (1, 0, 80, 1.0, 0),
  (2, 80, 100, 1.0, 0.01),
  (3, 100, 120, 1.2, 0.015),
  (4, 120, 999, 1.5, 0);
```

**优点**:
- 灵活可调整
- 业务人员可配置

**缺点**:
- 实现复杂
- 需要验证配置合法性

### 讨论点
1. **基准分数定义**：哪个风险总分应该是"正常项目"的基准？
2. **上浮比例**：高风险项目最多上浮多少合理（50%? 100%?）？
3. **低风险优惠**：是否给低风险项目打折（如0.9倍）？
4. **风险分布**：历史项目的风险总分通常在什么范围？

### 推荐方案
🎯 **建议采用方案A（分段线性）**
- 逻辑清晰，易于理解和调试
- 先固定分段规则，积累数据后再考虑方案C

**建议分段** (需要根据业务确认):
```javascript
const ratingFactor = 
  riskScore <= 80  ? 1.0  :    // 低风险项目：基准价
  riskScore <= 120 ? 1.0 + (riskScore - 80) * 0.0125 :  // 中等风险：1.0-1.5
                     1.5;       // 高风险项目：封顶1.5倍
```

---

## TODO-4: 四舍五入时机优化

### 当前问题
```javascript
// 最后统一取整
const result = {
  software_dev_cost: Math.round(dev.totalCost),        // 4.83 → 5
  system_integration_cost: Math.round(integration.totalCost),  // 1.94 → 2
  travel_cost: Math.round(travelCost),                // 2.16 → 2
  maintenance_cost: Math.round(maintenanceCost),      // 82.56 → 83
  risk_cost: Math.round(riskCost),                    // 8 → 8
  total_cost: Math.round(totalExactCost),             // 98.49 → 98
};
```

**问题分析**:
```
分项取整: 5 + 2 + 2 + 83 + 8 = 100
总额取整: Math.round(98.49) = 98

相差 2 万元！
```

### 改进方案

#### 方案A: 先求和再取整
```javascript
const totalExactCost = 
  dev.totalCost           // 4.83
  + integration.totalCost  // 1.94
  + travelCost            // 2.16
  + maintenanceCost       // 82.56
  + riskCost;             // 8

const result = {
  software_dev_cost: dev.totalCost.toFixed(2),               // 保留2位小数
  system_integration_cost: integration.totalCost.toFixed(2),
  travel_cost: travelCost.toFixed(2),
  maintenance_cost: maintenanceCost.toFixed(2),
  risk_cost: riskCost.toFixed(2),
  total_cost: Math.round(totalExactCost),  // 只有总额取整
};
```

**优点**:
- 总额准确
- 明细展示精确

**缺点**:
- 明细显示小数（如 4.83万元）

#### 方案B: 分项取整后调整总额
```javascript
const roundedItems = {
  software_dev_cost: Math.round(dev.totalCost),
  system_integration_cost: Math.round(integration.totalCost),
  travel_cost: Math.round(travelCost),
  maintenance_cost: Math.round(maintenanceCost),
  risk_cost: Math.round(riskCost),
};

// 计算取整误差
const roundedSum = Object.values(roundedItems).reduce((a, b) => a + b, 0);
const exactSum = dev.totalCost + integration.totalCost + travelCost + maintenanceCost + riskCost;
const diff = Math.round(exactSum) - roundedSum;

// 将误差加到最大项上
const maxKey = Object.keys(roundedItems).reduce((a, b) => 
  roundedItems[a] > roundedItems[b] ? a : b
);
roundedItems[maxKey] += diff;
```

**优点**:
- 明细和总额都是整数
- 总额 = 明细之和

**缺点**:
- 有一项会"吸收"误差，不够直观

#### 方案C: 保留1位小数
```javascript
const result = {
  software_dev_cost: Math.round(dev.totalCost * 10) / 10,  // 4.8
  // ... 其他类似
  total_cost: Math.round(totalExactCost * 10) / 10,
};
```

### 讨论点
1. **UI接受度**：用户能否接受 "4.83万元" 这样的显示？
2. **精度需求**：财务报价是否需要精确到小数？
3. **一致性**：总额与明细不一致是否可以接受？

### 推荐方案
🎯 **建议采用方案A（先求和再取整）**
- 明细保留2位小数，符合财务习惯
- 总额取整，方便对外报价
- 前端显示时可以格式化（如 `4.83` 显示为 `5`，hover显示精确值）

---

## TODO-5: 工作量数据返回前端

### 当前问题
```javascript
// 后端计算了工作量，但未返回
const dev = calculateWorkloadCost(...);  // 返回 { totalWorkload, totalCost }
// 只使用了 totalCost，totalWorkload 被丢弃

// 前端类型定义中有 total_workload，但实际未使用
type CalculationResult = {
  total_cost: number;
  total_workload: number;  // ❌ 未实现
};
```

### 改进方案

#### 后端修改
```javascript
// server/index.js - POST /api/calculate
const result = {
  software_dev_cost: Math.round(dev.totalCost),
  software_dev_workload: Math.round(dev.totalWorkload),  // ✅ 新增
  
  system_integration_cost: Math.round(integration.totalCost),
  system_integration_workload: Math.round(integration.totalWorkload),  // ✅ 新增
  
  travel_cost: Math.round(travelCost),
  
  maintenance_cost: Math.round(maintenanceCost),
  maintenance_workload: Math.round(maintenanceWorkload),  // ✅ 新增
  
  risk_cost: Math.round(riskCost),
  
  total_cost: Math.round(totalExactCost),
  total_workload: Math.round(
    dev.totalWorkload + 
    integration.totalWorkload + 
    maintenanceWorkload
  ),  // ✅ 新增
};
```

#### 前端类型定义修改
```typescript
// typings.d.ts
type CalculationResult = {
  software_dev_cost: number;
  software_dev_workload: number;  // ✅ 新增
  
  system_integration_cost: number;
  system_integration_workload: number;  // ✅ 新增
  
  travel_cost: number;
  
  maintenance_cost: number;
  maintenance_workload: number;  // ✅ 新增
  
  risk_cost: number;
  
  total_cost: number;
  total_workload: number;  // ✅ 已存在，现在真正实现
};
```

#### 前端展示修改
```typescript
// Overview.tsx
<Descriptions bordered>
  <Descriptions.Item label="软件研发成本" span={2}>
    <Statistic value={calculationResult.software_dev_cost} suffix="万元" />
  </Descriptions.Item>
  <Descriptions.Item label="研发工作量" span={1}>
    <Statistic value={calculationResult.software_dev_workload} suffix="人天" />
  </Descriptions.Item>
  
  <Descriptions.Item label="系统对接成本" span={2}>
    <Statistic value={calculationResult.system_integration_cost} suffix="万元" />
  </Descriptions.Item>
  <Descriptions.Item label="对接工作量" span={1}>
    <Statistic value={calculationResult.system_integration_workload} suffix="人天" />
  </Descriptions.Item>
  
  {/* ... 其他项 */}
  
  <Descriptions.Item label="报价总计" span={2}>
    <Statistic value={calculationResult.total_cost} suffix="万元" valueStyle={{ color: '#cf1322' }} />
  </Descriptions.Item>
  <Descriptions.Item label="总工作量" span={1}>
    <Statistic value={calculationResult.total_workload} suffix="人天" valueStyle={{ color: '#1890ff' }} />
  </Descriptions.Item>
</Descriptions>
```

### 讨论点
1. **展示位置**：工作量数据是否需要在总览中展示？
2. **颗粒度**：是否需要更细粒度的工作量（如按角色）？
3. **用途**：工作量数据主要用于什么场景（报表？资源规划？）？

### 推荐方案
🎯 **建议实现完整工作量返回**
- 后端返回所有工作量数据
- 前端在总览表格中展示
- 为未来的工作量分析、资源规划做准备

---

## 实施建议

### 阶段1: 高优先级 (1周)
- [ ] **TODO-3**: 评分因子逻辑优化（需先确认业务规则）

### 阶段2: 中优先级 (1周)
- [ ] **TODO-1**: 差旅成本配置化
- [ ] **TODO-2**: 运维成本配置化
- [ ] **TODO-5**: 工作量数据返回

### 阶段3: 低优先级 (按需)
- [ ] **TODO-4**: 四舍五入优化（可选）

---

## 讨论记录

### 讨论 #1 - 2025-10-21
**参与者**: [待填写]  
**议题**: 评分因子基准分数确定

**决议**:
- [ ] 确定基准风险分数（建议80-100分）
- [ ] 确定最大上浮比例（建议50%）
- [ ] 确定是否给低风险项目折扣

---

### 讨论 #2 - [待安排]
**参与者**: [待填写]  
**议题**: 配置化改造优先级

**待讨论**:
- [ ] 是否先实现配置化，再优化算法？
- [ ] 配置界面由谁开发？
- [ ] 历史数据迁移策略？

---

## 相关资源

- [计算逻辑技术文档](./calculation-logic-spec.md)
- [后端代码](../../server/index.js) (line 211-340)
- [前端组件](../../frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx)
- [类型定义](../../frontend/ppa_frontend/src/services/assessment/typings.d.ts)

---

**文档结束**
