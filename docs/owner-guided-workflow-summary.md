# Owner 引导工作流开发总结

**日期**: 2026-03-20
**版本**: v1.4
**会话**: Owner-guided Workflow 开发测试

---

## 一、需求概述

创建一个以 **Owner 视角** 为核心的问答式工作流，与现有的开发人员视角的 DB 引导工作流形成对比。

### 核心特性

1. **自然语言触发**：用户只需提问如"招标文件一共推送了多少？"
2. **自动引导澄清**：根据问题逐步引导用户澄清时间范围、推送状态等
3. **结构化输出**：自动完成数据映射、查询执行、报告生成
4. **智能分级报告**：根据数据复杂度自动生成轻量/标准/完整三级报告

---

## 二、工作流设计

### 2.1 流程步骤

```
OWNER_ENTRY → INTENT_CLARIFY → DATA_MAP → QUERY_BUILD → REPORT_GEN
```

### 2.2 意图类型

| 类型 | 说明 | 示例问题 |
|------|------|----------|
| `count` | 数量查询 | "招标文件一共推送了多少？" |
| `comparison` | 对比分析 | "哪个渠道的招标信息最多？" |
| `trend` | 趋势分析 | "最近推送趋势怎么样？" |
| `diagnosis` | 问题诊断 | "为什么推送成功率低？" |

### 2.3 报告分级规则

| 判断条件 | 报告级别 | 模板 |
|----------|----------|------|
| 行数=1 且 列数≤2 | Level 1（轻量） | 核心数据 + 一句话结论 |
| 行数 2-10 或 有分组维度 | Level 2（标准） | 核心发现 + 数据明细 + 建议 |
| 行数>10 或 意图=diagnosis | Level 3（完整） | 执行摘要 + 详细发现 + 附录 |

---

## 三、创建的文件

### 3.1 References 目录

| 文件 | 用途 |
|------|------|
| `owner-branch-entry.md` | Owner 引导入口，接收自然语言问题 |
| `owner-intent-clarify.md` | 意图澄清，问答式交互 |
| `owner-data-mapper.md` | 数据映射，业务术语→数据库 |
| `owner-query-builder.md` | 查询构建与执行 |
| `owner-report-gen.md` | 智能分级报告生成 |

### 3.2 更新的文件

| 文件 | 更新内容 |
|------|----------|
| `workflow-contract.md` | 添加 owner-guided 模式定义 (v3.0) |
| `SKILL.md` | 添加 Owner 菜单和快捷键 |
| `owner-branch-entry.md` | 添加用户提问样例 |
| `owner-data-mapper.md` | 添加字段映射表 |

---

## 四、测试场景与结果

### 测试 1: Level 1 轻量级报告

**问题**: "招标文件一共推送了多少？"

**意图类型**: `count`

**执行 SQL**:
```sql
SELECT COUNT(*) as value
FROM opportunity_tender_staging
WHERE push_status = 'pushed'
```

**结果**: 5 条

**报告级别**: Level 1（1 行 1 列）

**产物**: `owner-report-lite-draft-20260320-000000.md`

---

### 测试 2: Level 2 标准报告

**问题**: "哪个渠道的招标信息最多？"

**意图类型**: `comparison`

**执行 SQL**:
```sql
SELECT source_platform, COUNT(*) as count
FROM opportunity_tender_staging
GROUP BY source_platform
ORDER BY count DESC
```

**结果**: 3 个渠道，120 条数据

**报告级别**: Level 2（3 行 + 分组维度）

**产物**: `owner-report-standard-draft-20260320-000001.md`

---

### 测试 3: Level 3 完整报告

**问题**: "为什么最近推送成功率比较低？"

**意图类型**: `diagnosis`

**执行 SQL**:
```sql
SELECT push_status, COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM opportunity_tender_staging
GROUP BY push_status
ORDER BY count DESC
```

**结果**: pending=115(95.8%), pushed=5(4.2%)

**报告级别**: Level 3（diagnosis 类型）

**产物**: `owner-report-full-draft-20260320-000002.md`

---

## 五、用户提问样例

### 数量查询（Count）
- "招标文件一共推送了多少？"
- "最近一周有多少条新招标？"
- "已推送的招标文件有多少条？"

### 对比分析（Comparison）
- "哪个渠道的招标信息最多？"
- "各地区的招标数量排名怎么样？"
- "对比一下各平台的推送成功率"

### 趋势分析（Trend）
- "最近一个月的推送趋势怎么样？"
- "按月份看招标数量的变化"
- "最近推送量是上升还是下降？"

### 问题诊断（Diagnosis）
- "为什么最近推送成功率比较低？"
- "推送失败的主要原因是什么？"
- "分析推送量下降的原因"

### 金额/预算分析
- "各渠道的招标预算总额是多少？"
- "平均每个项目的预算是多少？"

---

## 六、业务术语映射

### 实体映射

| 业务术语 | 数据库表/字段 |
|----------|---------------|
| 招标文件 | `opportunity_tender_staging` |
| 推送记录 | `push_status` 字段 |
| 渠道/来源 | `source_platform` 字段 |
| 项目评估 | `projects` 表 |

### 指标映射

| 业务指标 | SQL 表达 |
|----------|---------|
| 数量 | `COUNT(*)` |
| 总计 | `SUM(field)` |
| 平均 | `AVG(field)` |
| 占比 | `* 100.0 / SUM(COUNT(*)) OVER()` |

### 时间映射

| 业务表达 | SQL 表达 |
|----------|---------|
| 最近一周 | `date >= date('now', '-7 days')` |
| 最近一月 | `date >= date('now', '-1 month')` |
| 最近三月 | `date >= date('now', '-3 months')` |

---

## 七、生成产物清单

```
outputs/
├── owner-intent-draft-20260320-000000.yaml
├── owner-data-map-draft-20260320-000000.yaml
├── owner-query-result-draft-20260320-000000.yaml
├── owner-report-lite-draft-20260320-000000.md
├── owner-intent-draft-20260320-000001.yaml
├── owner-data-map-draft-20260320-000001.yaml
├── owner-query-result-draft-20260320-000001.yaml
├── owner-report-standard-draft-20260320-000001.md
├── owner-intent-draft-20260320-000002.yaml
├── owner-data-map-draft-20260320-000002.yaml
├── owner-query-result-draft-20260320-000002.yaml
└── owner-report-full-draft-20260320-000002.md
```

---

## 八、待办事项

- [ ] 实现澄清问答的实际交互逻辑
- [ ] 添加常见问题模板库
- [ ] 考虑与 DT/TG/NC 标准流程的汇入
- [ ] 扩展支持更多业务场景（项目评估、用户分析等）

---

## 九、使用说明

### 触发方式

1. **自然语言提问**：直接输入问题，自动触发 `[OWNER]` 模式
2. **手动命令**：输入 `[OWNER]` 开始引导流程

### 快捷键

| 步骤 | 快捷键 |
|------|--------|
| Owner 引导 | `[OWNER]` |
| 意图澄清 | `[CLARIFY]` |
| 数据映射 | `[DATA_MAP]` |
| 查询构建 | `[QUERY_BUILD]` 或 `[QB]` |
| 报告生成 | `[REPORT_GEN]` 或 `[RG]` |

---

*文档由 Owner Guided Workflow 生成*
