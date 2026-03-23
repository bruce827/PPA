# infographic-requirement-guide v1.1 升级总结

**升级日期**: 2026-03-23  
**升级范围**: Owner 引导模式优化

---

## 新增功能

### 1. 扩展意图类型（4 种 → 7 种）

**新增**:
- `distribution` - 分布分析（"数据如何分布？"）
- `ranking` - 排名分析（"前 10 名是谁？"）
- `correlation` - 相关性分析（"两者有关系吗？"）

**文件**: `./references/owner-intent-types.md`

---

### 2. 数据预览功能

在 `DATA_MAP` 步骤中，现在会：
1. 生成 `preview_sql`（带 LIMIT 5）
2. 执行预览查询获取实际数据样例
3. 在产物中展示 `sample_rows`

**修改文件**: `./references/owner-data-mapper.md`

---

### 3. SQL 安全检查

新增安全检查机制：
- 只读操作验证（只允许 SELECT）
- 表名白名单验证
- 危险关键字检测（DROP/DELETE/INSERT 等）
- 参数化查询推荐

**产物字段**:
```yaml
security_check:
  passed: true/false
  read_only: true
  validated_tables: ["表名"]
  injection_risk: false
```

**实现脚本**: `./scripts/validate_sql.py`

---

### 4. 多轮追问支持

**新增快捷键**: `[FOLLOWUP]` 或 `[FU]`

**支持的追问类型**:
1. 维度下钻 - "按渠道再分析一下"
2. 时间对比 - "和上个月比怎么样？"
3. 条件筛选 - "只看已推送的"
4. 排序限制 - "只要前 5 名"
5. 指标变更 - "看总金额而不是数量"
6. 可视化请求 - "能画个图吗？"

**文件**: `./references/owner-followup.md`

---

## 修改文件清单

| 文件 | 变更类型 | 说明 | 状态 |
|------|----------|------|------|
| `SKILL.md` | 更新 | 添加新意图类型和 FOLLOWUP 命令 | ✅ |
| `references/owner-data-mapper.md` | 增强 | 添加数据预览和 SQL 安全检查 | ✅ |
| `references/owner-intent-types.md` | 新增 | 7 种意图类型详解 | ✅ |
| `references/owner-followup.md` | 新增 | 多轮追问支持规范 | ✅ |
| `references/workflow-contract.md` | 更新 | 添加新意图类型枚举 | ✅ |
| `references/owner-branch-entry.md` | 更新 | 支持 7 种意图识别 | ✅ |
| `references/owner-intent-clarify.md` | 更新 | 添加 3 种新意图澄清策略 | ✅ |
| `references/owner-report-gen.md` | 更新 | 添加多轮追问支持 | ✅ |
| `scripts/validate_sql.py` | 新增 | SQL 验证函数实现 | ✅ |
| `REGRESSION-TEST-v1.1.md` | 新增 | v1.1 回归测试用例 | ✅ |

---

## 已完成事项

1. ✅ 更新 `workflow-contract.md` 的 `intent_type` 枚举（7 种）
2. ✅ 更新 `owner-branch-entry.md` 支持新意图识别
3. ✅ 更新 `owner-report-gen.md` 支持多轮追问
4. ✅ 更新 `owner-intent-clarify.md` 添加新意图澄清策略
5. ✅ 实现 `validate_sql.py` SQL 验证脚本
6. ✅ 创建 `REGRESSION-TEST-v1.1.md` 回归测试用例
7. ✅ 测试 FOLLOWUP 流程完整执行（维度下钻）

---

## 待办事项

无（v1.1 核心功能全部完成）

---

## 测试结果

### FOLLOWUP 流程测试（2026-03-23）

**测试场景**: 维度下钻追问

**第一轮**:
- 用户问题："招标文件一共推送了多少？"
- 意图类型：count
- 报告级别：lite
- 产物：`owner-report-lite-draft-20260323-000000.md`

**第二轮追问**:
- 追问内容："按渠道再分析一下"
- 追问类型：维度下钻
- 继承筛选：push_status = 'pushed'
- 新增维度：source_platform
- 报告级别：followup-1
- 产物：`owner-report-followup-1-draft-20260323-000000.md`

**测试结果**: ✅ 通过

### SQL 验证测试

| 测试用例 | 输入 | 预期 | 实际 | 状态 |
|----------|------|------|------|------|
| 正常查询 | SELECT COUNT(*) FROM... | passed=true | passed=true | ✅ |
| DROP 拦截 | DROP TABLE users | passed=false | passed=false | ✅ |
| 非白名单表 | SELECT * FROM unknown | passed=false | passed=false | ✅ |
| 复杂查询 | SELECT...JOIN...GROUP BY | passed=true | passed=true | ✅ |

**测试结果**: ✅ 通过

---

## 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v1.0 | 2026-03-04 | 初始 Owner 引导模式 |
| v1.1 | 2026-03-23 | 扩展意图类型、数据预览、SQL 安全、多轮追问 |
