# 意图澄清 (Intent Clarify)

**版本**: v1.0
**快捷键**: `[CLARIFY]`
**用途**: 通过问答方式澄清用户意图，确保理解准确。

---

## 前置检查

1. 读取 `workflow-state.json` 与 `owner-intent` 产物。
2. 若 `OWNER_ENTRY` 未完成，提示先执行 `[OWNER]`。
3. 若意图已清晰（`clarification_needed: false`），直接跳过进入 `DATA_MAP`。

---

## 1. 澄清策略

根据意图类型选择澄清策略：

### 1.1 Count 类问题（数量查询）

**典型问题**："招标文件一共推送了多少？"

**澄清要点**：
1. 时间范围：全部时间 / 最近一周 / 最近一月 / 自定义
2. 推送状态：已推送 / 待推送 / 全部
3. 数据来源：全部渠道 / 指定渠道

**澄清模板**：
```
好的，我来帮你查询招标文件的推送数量。

为了确保数据准确，请确认：

1. **时间范围**：你想看哪个时间段的数据？
   - 全部时间
   - 最近一周
   - 最近一月
   - 最近三月
   - 自定义

2. **推送状态**：统计哪种状态的数据？
   - 已推送
   - 待推送
   - 全部状态

3. **数据来源**：需要按渠道筛选吗？
   - 全部渠道
   - 指定渠道（请说明）
```

### 1.2 Comparison 类问题（对比/排名）

**典型问题**："哪个渠道的招标信息最多？"

**澄清要点**：
1. 对比维度：渠道 / 地区 / 类型
2. 指标：数量 / 金额 / 成功率
3. 时间范围

**澄清模板**：
```
我来帮你分析各渠道的招标信息情况。

请确认以下信息：

1. **对比维度**：你想按什么维度对比？
   - 按渠道来源
   - 按省份地区
   - 按招标类型

2. **统计指标**：你想看什么指标？
   - 信息数量
   - 预算金额
   - 推送成功率

3. **时间范围**：分析哪个时间段？
   - 全部时间
   - 最近一月
   - 最近三月
```

### 1.3 Trend 类问题（趋势分析）

**典型问题**："最近推送量怎么样？"

**澄清要点**：
1. 时间粒度：按天 / 按周 / 按月
2. 时间范围：最近多久
3. 对比需求：是否需要同比/环比

### 1.4 Diagnosis 类问题（问题诊断）

**典型问题**："为什么最近推送量下降了？"

**澄清要点**：
1. 下降时间段：具体从什么时候开始
2. 对比基准：和哪个时期对比
3. 分析维度：渠道 / 地区 / 类型

### 1.5 Distribution 类问题（分布分析）- v1.1 新增

**典型问题**："各渠道的推送成功率分布如何？"

**澄清要点**：
1. 分布维度：按渠道 / 地区 / 类型
2. 统计指标：数量 / 金额 / 成功率
3. 是否需百分比：是/否

### 1.6 Ranking 类问题（排名分析）- v1.1 新增

**典型问题**："推送数量最多的前 10 个渠道"

**澄清要点**：
1. 排名维度：渠道 / 地区 / 类型
2. Top N 数量：前 5/前 10/前 N
3. 排序方向：从大到小/从小到大

### 1.7 Correlation 类问题（相关性分析）- v1.1 新增

**典型问题**："发布时间和预算金额有关系吗？"

**澄清要点**：
1. 字段 1：如发布时间
2. 字段 2：如预算金额
3. 分析方式：交叉表/热力图

---

## 2. 澄清记录

每轮澄清后记录：

```yaml
clarification_log:
  - round: 1
    question: "时间范围是？"
    answer: "最近一月"
    extracted_value:
      field: "published_date"
      operator: ">="
      value: "2026-02-20"
```

---

## 3. 更新意图产物

澄清完成后，更新 `owner-intent-{draft_id}.yaml`：

```yaml
# 更新 clarification_needed 为 false
clarification_needed: false

# 完善 final_intent
final_intent:
  entity: "opportunity_tender_staging"
  metric: "count"
  filters:
    time_field: "published_date"
    time_value: "2026-02-20"
    time_operator: ">="
    push_status: "pushed"
```

---

## 4. 状态更新

```json
{
  "workflow_mode": "owner-guided",
  "current_step": "INTENT_CLARIFY",
  "completed_steps": ["OWNER_ENTRY", "INTENT_CLARIFY"],
  "artifacts": {
    "owner_intent": "./outputs/owner-intent-{draft_id}.yaml"
  }
}
```

---

## 5. 下一步建议

推荐执行 `[DATA_MAP]` - 数据映射。
