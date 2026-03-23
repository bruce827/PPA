# 多轮追问支持 (Follow-up Questions)

**版本**: v1.1  
**快捷键**: `[FOLLOWUP]` 或 `[FU]`  
**用途**: 在报告生成后，支持用户基于上一轮结果深入分析

---

## 前置条件

1. 必须已完成一轮完整的 Owner 引导流程（至少执行到 `REPORT_GEN`）
2. `workflow-state.json` 中 `current_step = DONE` 或 `REPORT_GEN`
3. 存在上一轮的查询结果和报告产物

---

## 追问类型与处理逻辑

### 1. 维度下钻 (Drill-down)

**用户输入示例**：
- "按渠道再分析一下"
- "能看看不同地区的情况吗？"
- "按月份分组看呢？"

**处理逻辑**：
1. 识别新的分组维度（如 `source_platform`/`region`/`strftime('%Y-%m', published_date)`）
2. 保留上一轮的筛选条件（如 `push_status = 'pushed'`）
3. 修改 SQL：添加 `GROUP BY {新维度}` 和 `ORDER BY count DESC`
4. 重新执行查询并生成报告

**SQL 模式**：
```sql
SELECT {dimension}, COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM {table}
WHERE {保留的筛选条件}
GROUP BY {dimension}
ORDER BY count DESC
```

---

### 2. 时间对比 (Time Comparison)

**用户输入示例**：
- "和上个月比怎么样？"
- "环比变化是多少？"
- "同比去年呢？"

**处理逻辑**：
1. 识别时间对比类型（环比/同比）
2. 生成两个时间段的查询
3. 计算变化量和变化率

**SQL 模式**：
```sql
-- 当前期间
SELECT COUNT(*) as current_value
FROM {table}
WHERE {current_period_condition}

-- 上一期间
SELECT COUNT(*) as previous_value
FROM {table}
WHERE {previous_period_condition}

-- 合并查询（推荐）
SELECT 
  'current' as period, COUNT(*) as value
FROM {table} WHERE {current_condition}
UNION ALL
SELECT 
  'previous' as period, COUNT(*) as value
FROM {table} WHERE {previous_condition}
```

**输出模板**：
```
📊 时间对比分析

| 时期 | 数值 |
|------|------|
| 本期 | XXX  |
| 上期 | XXX  |

📈 环比变化：+XX%（增加 XX 条）
```

---

### 3. 条件筛选 (Filter)

**用户输入示例**：
- "只看已推送的"
- "排除预算为 0 的"
- "只要预算超过 100 万的"

**处理逻辑**：
1. 识别新的筛选条件
2. 在原有 WHERE 子句上添加 `AND {新条件}`
3. 重新执行查询

**筛选条件映射**：
| 用户表达 | SQL 条件 |
|----------|----------|
| 已推送 | `push_status = 'pushed'` |
| 待推送 | `push_status = 'pending'` |
| 预算>100 万 | `budget_amount > 1000000` |
| 排除预算为 0 | `budget_amount > 0` |

---

### 4. 排序和限制 (Sort & Limit)

**用户输入示例**：
- "按数量从大到小排"
- "只要前 5 名"
- "显示最少的 3 个"

**处理逻辑**：
1. 识别排序字段和方向
2. 添加/修改 `ORDER BY` 子句
3. 添加 `LIMIT N`

---

### 5. 聚合指标变更 (Metric Change)

**用户输入示例**：
- "不看数量了，看总金额"
- "平均预算是多少？"
- "最高和最低分别是多少？"

**处理逻辑**：
1. 识别新的聚合指标
2. 修改 `SELECT` 子句

**指标映射**：
| 用户表达 | SQL 表达 |
|----------|----------|
| 总金额 | `SUM(budget_amount)` |
| 平均预算 | `AVG(budget_amount)` |
| 最高预算 | `MAX(budget_amount)` |
| 最低预算 | `MIN(budget_amount)` |

---

### 6. 可视化请求 (Visualization)

**用户输入示例**：
- "能画个图吗？"
- "用柱状图展示"
- "有没有更直观的展示方式？"

**处理逻辑**：
1. 根据数据类型选择图表类型
2. 生成图表配置或描述
3. 可选：调用图表生成服务

**图表类型推荐**：
| 数据类型 | 推荐图表 |
|----------|----------|
| 分布对比 | 柱状图/条形图 |
| 时间趋势 | 折线图/面积图 |
| 占比分析 | 饼图/环形图 |
| 相关性 | 散点图/热力图 |

---

## 上下文保持

在多轮追问中，必须保持以下上下文：

| 上下文要素 | 如何保持 |
|------------|----------|
| 基础表 | 继承上一轮的 `target_table` |
| 时间范围 | 除非用户明确修改，否则保持不变 |
| 筛选条件 | 累加新条件，不覆盖旧条件 |
| 意图类型 | 可根据追问内容自动调整 |

---

## 状态管理

### 追问轮次记录

在 `workflow-state.json` 中添加 `followup_context`：

```json
{
  "draft_id": "draft-20260323-000000",
  "workflow_mode": "owner-guided",
  "current_step": "DONE",
  "completed_steps": ["OWNER_ENTRY", "INTENT_CLARIFY", "DATA_MAP", "QUERY_BUILD", "REPORT_GEN"],
  "followup_context": {
    "round": 1,
    "parent_intent": {
      "entity": "opportunity_tender_staging",
      "metric": "count",
      "filters": {
        "push_status": "pushed"
      }
    },
    "current_intent": {
      "entity": "opportunity_tender_staging",
      "metric": "count",
      "dimension": "source_platform",
      "filters": {
        "push_status": "pushed"
      }
    },
    "history": [
      {
        "round": 0,
        "user_input": "招标文件一共推送了多少？",
        "intent_type": "count",
        "sql": "SELECT COUNT(*)...",
        "artifacts": {
          "intent": "./outputs/owner-intent-draft-20260323-000000.yaml",
          "report": "./outputs/owner-report-lite-draft-20260323-000000.md"
        }
      }
    ]
  },
  "artifacts": {
    "owner_intent": "./outputs/owner-intent-draft-20260323-000000.yaml",
    "owner_data_map": "./outputs/owner-data-map-draft-20260323-000000.yaml",
    "owner_query_result": "./outputs/owner-query-result-draft-20260323-000000.yaml",
    "owner_report": "./outputs/owner-report-lite-draft-20260323-000000.md"
  }
}
```

---

## 产物命名

### 追问产物

追问产生的新报告使用以下命名：

- `owner-report-followup-{round}-{draft_id}.md`

示例：
- 第 1 轮追问：`owner-report-followup-1-draft-20260323-000000.md`
- 第 2 轮追问：`owner-report-followup-2-draft-20260323-000000.md`

### 追问产物文件结构

```yaml
# owner-query-result-followup-{round}-{draft_id}.yaml
draft_id: "{draft_id}"
followup_round: {round}
generated_at: "{timestamp}"

executed_sql: |
  {执行的 SQL}

query_result:
  columns: [...]
  rows: [...]
  row_count: {行数}

context_inherited_from:
  round: {上一轮轮次}
  preserved_filters: [...]
  new_dimension: "{新增维度}"

next_step: "FOLLOWUP"
```

---

## 退出追问

用户可随时退出追问流程：

- 输入新问题：自动开始新一轮 Owner 引导（重置 `followup_context`）
- 输入 `[OWNER]`：重置并重新开始
- 输入 `[P]`：查看当前状态

---

## 示例对话

### 示例 1：维度下钻

```
[Round 0]
用户："招标文件一共推送了多少？"
助手：共 **120 条** 招标文件...

[Round 1 - 追问]
用户："按渠道分析一下"
助手：
| 渠道 | 数量 | 占比 |
|------|------|------|
| 国家管网电子招标平台 | 80 | 66.7% |
| 中国石油招标投标网 | 20 | 16.7% |
| 中国海洋石油采办业务管理与交易系统 | 20 | 16.7% |

📄 报告已保存：`./outputs/owner-report-followup-1-draft-xxxxx.md`
```

### 示例 2：时间对比

```
[Round 0]
用户："最近一个月的推送趋势？"
助手：（展示时间序列数据）

[Round 1 - 追问]
用户："和上个月比怎么样？"
助手：
📊 时间对比分析

| 时期 | 数值 |
|------|------|
| 本月 (2026-03) | 80 条 |
| 上月 (2026-02) | 100 条 |

📈 环比变化：-20%（减少 20 条）
```

---

## 错误处理

| 情况 | 处理方式 |
|------|----------|
| 无上一轮上下文 | 提示用户先执行完整查询流程 |
| 追问无法解析 | 请求用户澄清具体需求 |
| SQL 执行失败 | 返回错误信息，建议调整查询条件 |
| 数据为空 | 告知用户并建议放宽筛选条件 |

---

## 执行步骤

1. **解析追问**：识别追问类型和新参数
2. **继承上下文**：从 `followup_context.parent_intent` 继承
3. **生成新 SQL**：基于追问类型修改 SQL
4. **执行查询**：获取新结果
5. **生成报告**：保存为 `owner-report-followup-{round}-{draft_id}.md`
6. **更新状态**：增加 `followup_context.round`，追加到 `history`

---

## 快捷命令

- `[FU]` 或 `[FOLLOWUP]`：进入追问模式
- `[FU dim={维度}]`：直接指定维度下钻
- `[FU time=compare]`：时间对比
- `[FU filter={条件}]`：添加筛选
- `[FU reset]`：重置追问上下文，开始新问题
