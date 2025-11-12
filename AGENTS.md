# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

项目评估系统 (Project Assessment System) - 基于 UMI Max + Ant Design 的项目评估管理平台，后端使用 SQLite 数据库。

## Non-Obvious Patterns

### Frontend Configuration
- UMI Max 使用 `.umirc.ts` 而不是标准 `config/config.ts`
- 禁用了 MFSU 功能 (`mfsu: false`) 以避免 findDOMNode 警告
- Prettier 配置包含特殊插件：`prettier-plugin-organize-imports` 和 `prettier-plugin-packagejson`
- 路由配置包含重定向逻辑：'/' → '/dashboard'
- 权限系统基于 `initialState` 的简单实现（`src/access.ts`）

### Backend Architecture
- 使用 Express 5.x（不是常见的 4.x 版本）
- 数据库文件 `ppa.db` 自动创建在 `server/` 目录
- 全局错误处理中间件必须放在最后（`middleware/errorHandler.js`）
- 优雅退出机制处理 SIGINT 信号并关闭数据库连接

### Testing Requirements
- 测试使用独立数据库文件 `ppa.test.db` 和 `NODE_ENV=test`
- 所有 API 响应必须 < 500ms（性能要求硬编码在测试中）
- 测试数据包含完整的中文角色名称（项目经理、高级开发等）

### Database Patterns
- 使用 JSON 字段存储复杂数据（`assessment_details_json`, `variables_json`）
- 数据库工具模块需要手动初始化（`db.init()`）
- 表结构包含项目评估特定字段：`final_total_cost`, `final_risk_score`, `final_workload_days`

### Development Workflow
- 必须同时运行前后端服务（端口 8000 和 3001）
- 前端服务文件使用 `/* eslint-disable */` 禁用 ESLint
- API 路径统一前缀 `/api`，前端代理处理跨域问题
- 数据库初始化是独立步骤（`node init-db.js`）