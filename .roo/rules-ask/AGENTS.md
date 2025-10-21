# Project Documentation Rules (Non-Obvious Only)

## Codebase Understanding
- 项目使用 UMI Max 框架，但配置文件路径和结构不同于标准 React 项目
- 路由配置在 `.umirc.ts` 文件中，包含代理和重定向配置
- 后端使用简单 Express.js 架构，数据库自动创建，无需额外配置
- API 路径统一前缀 `/api`，前端代理处理跨域问题

## Architecture Patterns
- 前后端分离架构，前端使用 TypeScript，后端使用原生 Node.js
- SQLite 作为数据库，文件型存储，无需单独的数据库服务器
- 权限控制通过 UMI Max 的 access 系统实现，基于用户状态判断