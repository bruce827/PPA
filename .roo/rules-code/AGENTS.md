# Project Coding Rules (Non-Obvious Only)

## Critical Patterns Discovered by Reading Files
- 前端使用 UMI Max 框架，所有页面组件放在 `src/pages/` 目录下
- 路由配置在 `frontend/ppa_frontend/.umirc.ts` 中定义，包含重定向逻辑（'/' 重定向到 '/dashboard'）
- 后端使用原生 Express.js + SQLite3，数据库文件 `ppa.db` 自动创建在 `server/` 目录
- API 路径前缀 `/api` 被前端代理到后端端口 3001
- 权限控制通过 `src/access.ts` 实现，基于 `initialState` 判断管理员权限

## Code Organization
- 前端组件按功能划分：`pages/` (页面组件), `services/` (服务调用), `utils/` (工具函数)
- 后端采用简单架构：`index.js` (主服务), `init-db.js` (数据库初始化)
- SQLite 数据库表结构包含项目评估相关字段：`final_total_cost`, `final_risk_score`, `final_workload_days`

## Development Workflow
- 前端开发时需要先运行后端服务（端口 3001）
- 数据库初始化脚本 `init-db.js` 创建完整的表结构，包括用户、配置、项目等表
- 前端代理配置确保开发时 API 调用正确路由到后端