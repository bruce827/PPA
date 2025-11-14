# AGENTS.md

# Repository Guidelines

## 项目结构与模块
- `frontend/ppa_frontend`（UMI Max + Ant Design）：配置在 `.umirc.ts`（`/` 重定向到 `/dashboard`，`/api` 代理到 `http://localhost:3001`，`mfsu: false`）。源码位于 `src/`（`access.ts`、`app.ts`、pages、services）。
- `server`（Express 5 + SQLite）：入口 `index.js`，数据库 `ppa.db`；分层 `controllers/ → services/ → models/`；中间件在 `middleware/`，测试在 `tests/`。

## 构建、测试与本地开发
- 前端
  - `cd frontend/ppa_frontend && npm install`
  - `npm run dev` 本地启动 `http://localhost:8000`
  - `npm run build` 构建到 `dist/`
  - `npm run format` 执行 Prettier 格式化
- 后端
  - `cd server && npm install`
  - `node init-db.js` 初始化表结构（可重复执行）
  - `node index.js` 启动 API `http://localhost:3001`
  - `npm test` 运行 Jest + Supertest
- 同时运行：需并行启动前端（8000）与后端（3001）。

## 代码风格与命名
- 缩进 2 空格；前端 TypeScript，后端 Node.js。
- 组件 PascalCase；文件/变量 camelCase；路由/控制器/服务与目录同名。
- 使用 Prettier，插件包含 `prettier-plugin-organize-imports`、`prettier-plugin-packagejson`（建议 `npm run format`）。

## 测试规范
- 测试位于 `server/tests`，命名 `*.test.js`，使用 `npm test` 执行。
- 使用独立测试库 `server/ppa.test.db` 与 `NODE_ENV=test`（由测试脚本处理）。
- 性能要求：所有 API 响应需 < 500ms（测试中断言）。

## 提交与 PR 规范
- 提交信息简洁祈使语，可中英混用；优先使用类型前缀。
  - 示例：`feat: 项目评估计算`、`fix: 修复成本四舍五入`、`refactor: controllers 分层`。
- PR 请包含：变更目的/摘要、关联 issue、运行与测试说明；前端改动附截图，接口改动附请求/响应示例。

## 架构与配置要点
- 全局错误处理中间件需放在最后：`server/middleware/errorHandler.js`。
- SQLite 文件自动生成于 `server/ppa.db`；SIGINT 触发优雅退出并关闭数据库连接。
- 复杂字段在数据库中以 JSON 存储（如 `assessment_details_json`、`variables_json`）。
- API 前缀为 `/api`，前端代理在 `frontend/ppa_frontend/.umirc.ts` 配置。

## AI 模型配置

PPA 系统集成了 AI 驱动的风险评估功能，支持多种 AI 模型提供商。

### 支持的 AI 提供商

1. **OpenAI**
   - 支持 GPT 系列模型（如 `gpt-4-turbo`、`gpt-3.5-turbo` 等）
   - API Host: `https://api.openai.com`
   - 实现位置：`server/providers/ai/openaiProvider.js`

2. **Doubao（豆包）/ Volcano Engine（火山引擎）**
   - 字节跳动的大语言模型服务
   - 兼容 OpenAI Chat Completions API 格式
   - 实现位置：`server/providers/ai/doubaoProvider.js`

### 配置字段说明

AI 模型配置存储在 `ai_model_configs` 表中，包含以下字段：

- `config_name`: 配置名称（必填，唯一）
- `description`: 配置描述
- `provider`: 提供商标识（必填，如 `openai`、`doubao`、`volcengine`）
- `api_key`: API 密钥（必填）
- `api_host`: API 服务地址（必填）
- `model_name`: 模型名称（必填，如 `gpt-4-turbo`）
- `temperature`: 温度参数（默认 `0.7`，控制输出随机性）
- `max_tokens`: 最大 token 数（默认 `2000`）
- `timeout`: 超时时间（秒，默认 `30`）
- `is_current`: 是否为当前使用的模型（`0` 或 `1`，系统同时只能有一个当前模型）
- `is_active`: 是否启用（`0` 或 `1`）

### API 端点

模型配置相关 API（`server/controllers/aiModelController.js`）：

- `GET /api/ai-models` - 获取所有模型配置列表
- `GET /api/ai-models/current` - 获取当前使用的模型
- `GET /api/ai-models/:id` - 获取指定模型配置详情
- `POST /api/ai-models` - 创建新的模型配置
- `PUT /api/ai-models/:id` - 更新模型配置
- `DELETE /api/ai-models/:id` - 删除模型配置（不能删除当前使用的模型）
- `POST /api/ai-models/:id/set-current` - 设置指定模型为当前使用
- `POST /api/ai-models/:id/test` - 测试模型连接
- `POST /api/ai-models/test-temp` - 临时测试配置（不保存到数据库）

### AI 风险评估功能

位置：`server/services/aiRiskAssessmentService.js`

核心功能：
- `assessRisk(payload)`: 基于项目文档和当前风险项，使用 AI 自动评估风险等级
- `normalizeRiskNames(payload)`: 将 AI 输出的风险项名称标准化为系统预定义的名称

评估流程：
1. 从数据库获取当前激活的 AI 模型配置
2. 根据 `provider` 字段选择对应的 Provider（OpenAI 或 Doubao）
3. 构造提示词并调用 AI 接口
4. 解析 AI 返回的 JSON 响应，提取风险评分
5. 记录评估日志到 `ai_assessment_logs` 表

### 环境变量配置（可选）

当未配置数据库中的模型时，系统会回退到环境变量：

- `AI_PROVIDER_BASE_URL`: 默认 API 地址
- `AI_PROVIDER_API_KEY`: 默认 API 密钥
- `AI_PROVIDER_MODEL`: 默认模型名称
- `AI_PROVIDER_TEMPERATURE`: 默认温度参数
- `AI_PROVIDER_MAX_TOKENS`: 默认最大 token 数
- `AI_PROVIDER_TIMEOUT_MS`: 默认超时时间（毫秒）
- `AI_PROVIDER_SYSTEM_PROMPT`: 默认系统提示词
