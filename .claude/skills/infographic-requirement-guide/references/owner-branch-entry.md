# Owner 引导入口 (Owner Branch Entry)

**版本**: v1.0
**快捷键**: `[OWNER]` 或自然语言提问自动触发
**用途**: 接收 Owner 的自然语言问题，启动问答式引导流程。

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若当前已有进行中的 `owner-guided` 流程，询问是否继续或重新开始。
3. 若 `[QUERY_BUILD]` 已完成，询问是否重跑；确认后按契约清理下游步骤。

---

## 1. 接收自然语言问题

### 1.1 用户提问样例

用户可以用自然语言直接提问，以下是推荐的提问方式：

**📊 数量查询（Count）**
- "招标文件一共推送了多少？"
- "最近一周有多少条新招标？"
- "已推送的招标文件有多少条？"

**📈 对比分析（Comparison）**
- "哪个渠道的招标信息最多？"
- "各地区的招标数量排名怎么样？"
- "对比一下各平台的推送成功率"

**📉 趋势分析（Trend）**
- "最近一个月的推送趋势怎么样？"
- "按月份看招标数量的变化"
- "最近推送量是上升还是下降？"

**🔍 问题诊断（Diagnosis）**
- "为什么最近推送成功率比较低？"
- "推送失败的主要原因是什么？"
- "分析推送量下降的原因"

**💰 金额/预算分析**
- "各渠道的招标预算总额是多少？"
- "平均每个项目的预算是多少？"

**⏰ 时间范围查询**
- "最近一周/一月/一季度的数据"
- "今年以来的招标情况"

---

## 2. 问题要素提取

从用户问题中提取以下要素：

| 要素 | 说明 | 示例 |
|------|------|------|
| `entity` | 关注的业务实体 | 招标文件、项目、渠道 |
| `metric` | 想要的指标 | 数量、金额、占比、趋势 |
| `time_range` | 时间范围（如有） | 最近一个月、今年、上周 |
| `dimension` | 想要的分组维度（如有） | 按渠道、按地区、按类型 |
| `intent_type` | 意图类型 | `count`/`comparison`/`trend`/`diagnosis`/`distribution`/`ranking`/`correlation` |

---

## 3. 意图分类

根据问题特征，自动分类：

| 意图类型 | 关键词 | 输出 |
|----------|--------|------|
| `count` | 多少、几个、总计 | 单一数值或简单分组 |
| `comparison` | 哪个最、对比、排名 | 排序或对比分析 |
| `trend` | 趋势、变化、最近 | 时间序列分析 |
| `diagnosis` | 为什么、原因、下降 | 多维下钻分析 |
| `distribution` | 分布、占比、分散、集中 | 分组统计 + 百分比 |
| `ranking` | 排名、前几、top、最多、最少 | 排序 +LIMIT |
| `correlation` | 关系、相关、影响、关联 | 多字段交叉分析 |

---

## 4. 澄清式问答

根据提取的要素，判断是否需要澄清：

### 4.1 需要澄清的情况

| 情况 | 澄清问题示例 |
|------|-------------|
| 时间范围模糊 | "你想看哪个时间范围的数据？比如最近一周、最近一月、还是全部？" |
| 实体歧义 | "你说的'推送'是指招标公告推送，还是其他类型的推送？" |
| 指标不明确 | "你想看推送的数量，还是推送的成功率，还是其他指标？" |
| 维度缺失 | "你想按什么维度看？比如按渠道、按地区、还是按时间？" |

### 4.2 无需澄清的情况

当问题要素完整时，直接进入下一步：
> "好的，我来帮你查询**招标文件推送数量**。请稍等..."

---

## 5. 产物输出

### 5.1 文件名

`owner-intent-{draft_id}.yaml`

### 5.2 保存路径

`./outputs/owner-intent-{draft_id}.yaml`

### 5.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

original_question: "{用户原始问题}"

extracted_elements:
  entity: "{业务实体}"
  metric: "{指标}"
  time_range: "{时间范围或 null}"
  dimension: "{维度或 null}"

intent_type: "{count|comparison|trend|diagnosis|distribution|ranking|correlation}"

clarification_needed: true/false
clarification_log:
  - question: "{澄清问题}"
    answer: "{用户回答}"

final_intent:
  entity: "{确认后的实体}"
  metric: "{确认后的指标}"
  filters:
    time_field: "{时间字段或 null}"
    time_value: "{时间值或 null}"
    other_filters: []

next_step: "DATA_MAP"
```

---

## 6. 状态更新

```json
{
  "workflow_mode": "owner-guided",
  "current_step": "OWNER_ENTRY",
  "completed_steps": ["OWNER_ENTRY"],
  "artifacts": {
    "owner_intent": "./outputs/owner-intent-{draft_id}.yaml"
  }
}
```

---

## 7. 下一步建议

推荐执行 `[DATA_MAP]` - 数据映射，将业务问题映射到数据库表。
