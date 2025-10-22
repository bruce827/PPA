# 计算逻辑改进待办清单

<!-- markdownlint-disable -->

**创建日期**: 2025-10-21  
**相关文档**: [calculation-logic-spec.md](./calculation-logic-spec.md)  
**优先级定义**: 🔴 高优先级 | 🟡 中优先级 | 🟢 低优先级

---

## 待办事项概览

| 编号 | 问题 | 优先级 | 状态 | 预估工作量 |
|------|------|--------|------|-----------|
| TODO-1 | 差旅成本硬编码 | 🟡 中 | ✅ 已完成 | 2小时 → 1小时 |
| TODO-2 | 运维成本单价硬编码 | 🟡 中 | ✅ 已完成 | 1小时 |
| TODO-3 | 评分因子计算逻辑优化 | 🔴 高 | ✅ 已完成 | 3小时 → 4小时 |
| TODO-4 | 四舍五入时机优化 | 🟢 低 | ✅ 已完成 | 1小时 → 1.5小时 |
| TODO-5 | 工作量数据返回前端 | 🟡 中 | ✅ 已完成 | 2小时 → 3小时 |

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

### 原始问题（TODO-2）

```javascript
// server/index.js - POST /api/calculate
const maintenanceCost = maintenanceWorkload * 0.16;  // ❌ 硬编码
```

**问题分析**:

- 运维人员日单价 `0.16万` 硬编码
- 实际运维单价可能随角色/经验变化

### 实施方案（TODO-2）

✅ **已完成：读取表单字段 + 默认配置值**

- 前端在其他成本页新增 `maintenance_daily_cost` 字段，默认 1600 元/人天，可由用户覆盖
- 评估计算请求透传该字段，后端 `calculateProjectCost` 使用 `assessmentData.maintenance_daily_cost`
- 若未填写，回退到 `DEFAULTS.MAINTENANCE_DAILY_COST`（1600）
- 维护成本计算公式：`maintenanceWorkload * (maintenanceDailyCost / 10000)`，以万元计费

### 实施记录（已完成）

**完成时间**: 2025-10-22  
**修改文件**:

1. `frontend/ppa_frontend/src/pages/Assessment/components/OtherCostsForm.tsx`
2. `frontend/ppa_frontend/src/pages/Assessment/New.tsx`
3. `server/services/calculationService.js`
4. `server/utils/constants.js`

**验证要点**:

- 无硬编码 `0.16`，统一走用户输入或默认常量
- 后端返回的维护成本随输入单价变化而变化
- 默认值 1600 元保证历史数据向后兼容

---

## TODO-3: 评分因子计算逻辑优化 ✅ 已上线

### 背景回顾（TODO-3）
旧实现直接使用 `riskScore / 100` 作为系数，导致风险越低报价越低（60 分项目仅按 0.6 倍结算），与“风险越高利润越高”的业务预期相反。
 
### 最终算法（2025-10-22）

1. **风险得分**：汇总 `assessmentData.risk_scores` 中各风险项的选项分值。
2. **动态上限**：解析 `config_risk_items.options_json`，按每个风险项的最高可选分值求和；如配置为空则回退到默认 100 分。
3. **得分占比**：`ratio = clamp(riskScore / maxScore, 0, 1.2)`，最多按 120% 参与计算。
4. **分段线性映射**（与前端 Tooltip 描述一致）：
  - `ratio ≤ 0.8` → 系数 `1.0`（基准价）
  - `0.8 < ratio ≤ 1.0` → 在线性区间内从 `1.0` 递增到 `1.2`
  - `1.0 < ratio ≤ 1.2` → 在线性区间内从 `1.2` 递增到封顶 `1.5`
  - `ratio > 1.2` → 直接取封顶 `1.5`

#### 系数映射表

| 风险占比（ratio） | 报价系数 | 报价调整 |
|------------------|----------|----------|
| ≤ 80%            | 1.00     | 基准价 |
| 90%              | ≈1.10    | +10% |
| 100%             | 1.20     | +20% |
| 110%             | ≈1.35    | +35% |
| ≥ 120%           | 1.50     | +50%（封顶） |

风险等级仍按照占比阈值 40% / 70% 划分“低/中/高风险”，保持与前端展示一致。

### 前后端改动要点（TODO-3）

- **后端计算**：在 `server/utils/rating.js` 中新增 `computeRatingFactor`，供 `server/services/calculationService.js` 调用，并随响应返回 `rating_factor`、`rating_ratio` 与 `risk_max_score`。
- **前端复用**：新增 `frontend/ppa_frontend/src/utils/rating.ts` 复用同一套解析与分段逻辑，`New.tsx` 的统计卡增加 Tooltip“风险得分占比 xx%（动态阈值）”。
- **结果展示**：`Overview.tsx` 在报价结果区新增“评分因子”卡片，并通过 Tooltip 说明“当前风险得分合计 N，占配置上限 M%”；详情图标使用 `InfoCircleOutlined`。

### 实施记录（TODO-3）

**完成时间**: 2025-10-22  
**主要修改文件**:

- `server/utils/constants.js`
- `server/utils/rating.js`
- `server/services/calculationService.js`
- `frontend/ppa_frontend/src/utils/rating.ts`
- `frontend/ppa_frontend/src/pages/Assessment/New.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`
- `frontend/ppa_frontend/src/pages/Assessment/components/RiskScoringForm.tsx`
- `frontend/ppa_frontend/src/services/assessment/typings.d.ts`

**验证要点**:

- 不填写风险项时使用默认上限 100 分，系数保持 1.0。
- 任意风险项配置变化（新增选项/修改分值）会自动推导新的上限并同步到前端。
- 结果接口额外字段 `rating_factor`、`rating_ratio`、`risk_max_score` 与前端展示一致，Tooltip 文案直观说明系数来源。

---

## TODO-4: 四舍五入时机优化 ✅ 已上线

### 背景问题
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

### 改造要点

1. **后端计算调整**（2025-10-22）
   - 引入 `roundToDecimals` 辅助函数，统一将各分项金额保留两位小数，避免浮点误差。
   - 分项字段（研发/对接/差旅/运维/风险）返回两位小数精度，额外暴露 `total_cost_exact` 用于总额提示。
   - 总额仍按万元四舍五入（`Math.round(totalExactCost)`），用于对外报价与历史记录。

2. **前端展示策略**
   - `Overview` 页面成本面板统一设置 `precision={2}`，直观展示小数金额。
   - 报价总计包裹 Tooltip，悬停显示精确总成本（两位小数），兼顾报价沟通与审核需求。

### 实施记录
**完成时间**: 2025-10-22  
**修改文件**:
- `server/services/calculationService.js`
- `frontend/ppa_frontend/src/services/assessment/typings.d.ts`
- `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`

**验证要点**:
- 分项金额与数据库导出保持两位小数，避免累加误差。
- 报价总计 Tooltip 显示与精确总和一致，圆整值用于对外沟通。
- 历史记录仍存储圆整总额，兼容现有报表与导出逻辑。

---

## TODO-5: 工作量数据返回前端 ✅ 已上线

### 实施摘要
- 后端 `calculateProjectCost` 现返回研发/对接/运维三类工作量（人天）及总工作量，并对数据统一取整，确保与报价明细一致。
- `/api/calculate` 与项目保存流程沿用 `total_workload_days` 字段写入数据库，同时补充模块级字段，兼容旧数据。
- 前端类型 `API.CalculationResult` 同步扩展，`Overview` 总览页将成本与工作量成对展示，新增「总工作量」高亮指标，便于评估资源投入。

### 实施记录
**完成时间**: 2025-10-22  
**主要修改文件**:

- `server/services/calculationService.js`
- `frontend/ppa_frontend/src/services/assessment/typings.d.ts`
- `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`

**验证要点**:

- 按照不同维度填写工作量并重新计算，前端能准确显示各模块成本与人天。 
- 保存项目后，历史记录中的 `final_workload_days` 与界面展示一致。 
- 未填写运维或对接工作量时，对应字段显示为 0 人天，不影响其他部分。

---

## 实施建议

### 阶段1: 高优先级 (1周)
- [x] **TODO-3**: 评分因子逻辑优化（2025-10-22 上线，动态阈值 + Tooltip 已落地）

### 阶段2: 中优先级 (1周)
- [x] **TODO-1**: 差旅成本配置化
- [x] **TODO-2**: 运维成本配置化
- [x] **TODO-5**: 工作量数据返回

### 阶段3: 低优先级 (按需)
- [ ] **TODO-4**: 四舍五入优化（可选）

---

## 讨论记录

### 讨论 #1 - 2025-10-21
**参与者**: [待填写]  
**议题**: 评分因子基准分数确定

**决议**:
- [x] 确定基准风险分数（80% 起步，超 120% 封顶）
- [x] 确定最大上浮比例（封顶 1.5 倍 ≈ +50%）
- [ ] 确定是否给低风险项目折扣（暂不折扣，保持 1.0）

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
- [评分系数核心逻辑](../../server/utils/rating.js)
- [前端组件](../../frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx)
- [前端评分工具](../../frontend/ppa_frontend/src/utils/rating.ts)
- [类型定义](../../frontend/ppa_frontend/src/services/assessment/typings.d.ts)

---

**文档结束**
