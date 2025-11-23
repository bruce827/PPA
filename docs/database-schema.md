# 数据库表结构（PPA / server）

- 库文件：`server/ppa.db`（SQLite）
- 布尔字段使用 0/1，JSON 数据以 TEXT 存储（`assessment_details_json`、`variables_json` 等）
- 默认时间字段：`created_at`/`updated_at` 使用 `CURRENT_TIMESTAMP`

## 迁移执行顺序
1. `node server/migrations/000_create_core_tables.js`（projects / config_* / users）
2. `node server/migrations/001_create_ai_model_configs.js`（ai_model_configs + 索引）
3. `node server/migrations/002_create_prompt_templates.js`（prompt_templates + 索引）
4. `node server/migrations/003_create_ai_prompts_table.js`（ai_prompts / ai_assessment_logs + 索引）

## 表结构
### projects
- 用途：存储项目与模板（`is_template` 区分）
- 字段：`id` INTEGER PK；`name` TEXT NOT NULL；`description` TEXT；`is_template` INTEGER NOT NULL DEFAULT 0；`final_total_cost` REAL；`final_risk_score` INTEGER；`final_workload_days` REAL；`assessment_details_json` TEXT；`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP；`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- 约束/索引：无额外索引（可按需为 `is_template, created_at` 建索引以加速列表查询）

### config_roles
- 用途：角色单价配置
- 字段：`id` INTEGER PK；`role_name` TEXT NOT NULL UNIQUE；`unit_price` REAL NOT NULL；`is_active` INTEGER NOT NULL DEFAULT 1
- 约束/索引：`role_name` 唯一

### config_risk_items
- 用途：风险评估项及选项 JSON
- 字段：`id` INTEGER PK；`category` TEXT NOT NULL；`item_name` TEXT NOT NULL；`options_json` TEXT NOT NULL；`is_active` INTEGER NOT NULL DEFAULT 1
- 约束/索引：无

### config_travel_costs
- 用途：差旅成本配置
- 字段：`id` INTEGER PK；`item_name` TEXT NOT NULL UNIQUE；`cost_per_month` REAL NOT NULL；`is_active` INTEGER NOT NULL DEFAULT 1
- 约束/索引：`item_name` 唯一

### users
- 用途：预留用户/权限表
- 字段：`id` INTEGER PK；`username` TEXT NOT NULL UNIQUE；`password_hash` TEXT NOT NULL；`role` TEXT DEFAULT 'user'
- 约束/索引：`username` 唯一

### ai_model_configs
- 用途：AI 模型配置（API Key/Host 等）
- 字段：`id` INTEGER PK；`config_name` TEXT NOT NULL UNIQUE；`description` TEXT；`provider` TEXT NOT NULL；`api_key` TEXT NOT NULL；`api_host` TEXT NOT NULL；`model_name` TEXT NOT NULL；`temperature` REAL NOT NULL DEFAULT 0.7；`max_tokens` INTEGER NOT NULL DEFAULT 2000；`timeout` INTEGER NOT NULL DEFAULT 30；`is_current` INTEGER NOT NULL DEFAULT 0；`is_active` INTEGER NOT NULL DEFAULT 1；`last_test_time` DATETIME；`test_status` TEXT；`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP；`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- 约束/索引：`config_name` 唯一；`idx_ai_model_configs_is_current`（唯一部分索引，保证仅一条记录 `is_current=1`）；`idx_ai_model_configs_config_name` 普通索引

### prompt_templates
- 用途：提示词模板配置
- 字段：`id` INTEGER PK；`template_name` TEXT NOT NULL；`category` TEXT NOT NULL CHECK (category IN ('risk_analysis','cost_estimation','report_generation','custom'))；`description` TEXT；`system_prompt` TEXT NOT NULL；`user_prompt_template` TEXT NOT NULL；`variables_json` TEXT；`is_system` BOOLEAN NOT NULL DEFAULT 0；`is_active` BOOLEAN NOT NULL DEFAULT 1；`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP；`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- 约束/索引：索引 `idx_prompt_category` / `idx_prompt_active` / `idx_prompt_system`

### ai_prompts
- 用途：AI 提示词内容库（含变量与模型提示）
- 字段：`id` TEXT PK；`name` TEXT NOT NULL；`description` TEXT；`content` TEXT NOT NULL；`variables_json` TEXT；`model_hint` TEXT；`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP；`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- 约束/索引：索引 `idx_ai_prompts_model_hint`

### ai_assessment_logs
- 用途：AI 调用日志（可选写入）
- 字段：`id` INTEGER PK AUTOINCREMENT；`prompt_id` TEXT；`model_used` TEXT；`request_hash` TEXT；`duration_ms` INTEGER；`status` TEXT NOT NULL；`error_message` TEXT；`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- 约束/索引：索引 `idx_ai_assessment_logs_prompt`
