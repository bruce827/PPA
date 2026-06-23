# DB 引导入口 (DB Branch Entry)

**版本**: v1.0
**快捷键**: `[DB]`
**用途**: 从项目数据库 (`ppa.db`) 开始的数据可视化分析引导入口。

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 检查数据库文件是否存在：`../../../server/ppa.db`
3. 若 `DBS` 已完成，询问是否重跑；确认后按契约清理下游步骤。

---

## 1. 数据库连接检查

执行以下命令验证数据库可访问：

```bash
sqlite3 ../../../server/ppa.db "SELECT 1;"
```

若成功返回 `1`，继续执行。若失败，提示用户检查数据库路径。

---

## 2. 可用数据表清单

执行以下命令获取表列表：

```bash
sqlite3 ../../../server/ppa.db ".tables"
```

向用户展示可用表清单（按业务相关性排序）：

### 核心业务表（推荐）
- `projects` - 项目评估数据（成本、风险、工作量）
- `opportunity_bidding_sites` - 招标信息来源网站
- `opportunity_tender_staging` - 招标公告数据

### 配置表
- `config_roles` - 角色配置
- `config_risk_items` - 风险项配置
- `ai_model_configs` - AI 模型配置

### 系统表
- `users` - 用户
- `ai_assessment_logs` - 评估日志

---

## 3. 引导用户选择数据源

询问用户：

> **你想分析哪个数据表？**
>
> 1. `projects` - 项目成本/风险/工作量分析
> 2. `opportunity_bidding_sites` - 招标渠道质量分析
> 3. `opportunity_tender_staging` - 招标趋势分析
> 4. 其他表（请指定表名）

---

## 4. 产物输出

### 4.1 文件名

`db-source-selection-{draft_id}.yaml`

### 4.2 保存路径

`./outputs/db-source-selection-{draft_id}.yaml`

### 4.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

selected_table: "{table_name}"
table_description: "{业务描述}"
analysis_intent: "{初步分析意图}"

next_step: "DBS"
```

---

## 5. 状态更新

```json
{
  "workflow_mode": "db-guided",
  "current_step": "DB",
  "completed_steps": ["DB"],
  "artifacts": {
    "db_source_selection": "./outputs/db-source-selection-{draft_id}.yaml"
  }
}
```

---

## 6. 下一步建议

推荐执行 `[DBS]` - 数据源选择与字段定义。
