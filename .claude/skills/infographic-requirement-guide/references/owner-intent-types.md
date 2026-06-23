# Owner 引导模式 - 意图类型扩展

**版本**: v1.1  
**用途**: 扩展支持的意图类型，从 4 种增至 7 种

---

## 意图类型总览

| 意图类型 | 英文标识 | 典型问题 | SQL 模式 |
|----------|----------|----------|----------|
| 数量查询 | `count` | "一共多少？" | `COUNT(*)` |
| 对比分析 | `comparison` | "哪个最多？" | `GROUP BY + ORDER BY` |
| 趋势分析 | `trend` | "最近怎么样？" | `时间分组 + ORDER BY` |
| 问题诊断 | `diagnosis` | "为什么下降？" | `多维度下钻` |
| 分布分析 | `distribution` | "数据如何分布？" | `GROUP BY + AVG/COUNT` |
| 排名分析 | `ranking` | "前 10 名是谁？" | `ORDER BY + LIMIT` |
| 相关性分析 | `correlation` | "两者有关系吗？" | `多字段分组` |

---

## 新增意图类型详解

### 1. 分布分析 (distribution)

**典型问题**：
- "各渠道的推送成功率分布如何？"
- "预算金额在不同地区的分布情况"
- "招标类型的占比分布"

**SQL 模式**：
```sql
SELECT 
  {dimension} as category,
  COUNT(*) as count,
  ROUND(AVG({metric_field}), 2) as avg_value,
  ROUND(MIN({metric_field}), 2) as min_value,
  ROUND(MAX({metric_field}), 2) as max_value
FROM {table}
WHERE {conditions}
GROUP BY {dimension}
ORDER BY count DESC
```

**可视化建议**：直方图、箱线图、密度图

---

### 2. 排名分析 (ranking)

**典型问题**：
- "推送数量最多的前 10 个渠道"
- "预算最高的 5 个项目"
- "哪个地区招标最多"

**SQL 模式**：
```sql
SELECT 
  {dimension} as category,
  COUNT(*) as value,
  RANK() OVER (ORDER BY COUNT(*) DESC) as rank
FROM {table}
WHERE {conditions}
GROUP BY {dimension}
ORDER BY value DESC
LIMIT {N}
```

**可视化建议**：条形图、排名图、Top N 列表

---

### 3. 相关性分析 (correlation)

**典型问题**：
- "发布时间和预算金额有关系吗？"
- "渠道来源和推送成功率相关吗？"
- "地区类型和招标数量有关联吗？"

**SQL 模式**：
```sql
SELECT 
  {field1} as dim1,
  {field2} as dim2,
  COUNT(*) as frequency,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM {table}
WHERE {conditions}
GROUP BY {field1}, {field2}
ORDER BY frequency DESC
```

**可视化建议**：热力图、散点图、交叉表

---

## 意图识别规则

### 关键词匹配

| 意图类型 | 关键词 |
|----------|--------|
| `count` | 多少、几个、总计、一共、数量 |
| `comparison` | 哪个最、对比、比较、差异 |
| `trend` | 趋势、变化、最近、走势、升降 |
| `diagnosis` | 为什么、原因、分析、诊断 |
| `distribution` | 分布、占比、分散、集中 |
| `ranking` | 排名、前几、top、最多、最少 |
| `correlation` | 关系、相关、影响、关联 |

### 意图分类决策树

```
用户问题
├── 问数量？ → count
│   └── 有"前 N"？ → ranking
├── 问对比？ → comparison
├── 问趋势？ → trend
├── 问原因？ → diagnosis
├── 问分布？ → distribution
├── 问排名？ → ranking
└── 问关系？ → correlation
```

---

## 意图升级规则

某些情况下需要升级意图类型：

1. **count → ranking**: 当用户问"最多的 N 个"时
2. **count → comparison**: 当用户要求按维度分组时
3. **comparison → distribution**: 当需要统计分布信息时
4. **diagnosis → correlation**: 当需要验证因果关系时

---

## 多轮追问支持

完成一轮查询后，支持以下追问类型：

### 1. 维度下钻
> 用户："按渠道再分析一下"

### 2. 时间对比
> 用户："和上个月比怎么样？"

### 3. 条件筛选
> 用户："只看已推送的"

### 4. 可视化请求
> 用户："能画个图吗？"

### 5. 原因探究
> 用户："为什么会这样？"

---

## 意图澄清检查清单

在执行查询前，确认以下要素：

- [ ] 意图类型已确定
- [ ] 时间范围已确认
- [ ] 筛选条件已明确
- [ ] 分组维度（如需要）已指定
- [ ] 排序方式（如需要）已确认
- [ ] 限制数量（如需要）已设定
