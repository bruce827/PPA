# Project Architecture Rules (Non-Obvious Only)

## System Architecture
- 前后端完全分离，前端运行在 8000 端口，后端 3001 端口
- SQLite 文件型数据库，无需外部数据库服务，简化部署
- API 统一前缀设计，前端通过代理处理跨域和路径映射

## Directory Structure Constraints
- 前端代码必须放在 `frontend/ppa_frontend/src/` 目录结构
- 页面组件必须放在 `src/pages/` 子目录下，遵循 UMI Max 约定
- 后端代码放在 `server/` 根目录，保持简单架构
- 数据库文件自动创建在 `server/` 目录下

## Development Architecture
- 开发环境需要同时运行两个服务，增加了复杂度但提供了灵活性
- 代理配置将前端 API 调用透明地路由到后端，避免 CORS 问题
- 数据库初始化脚本独立运行，确保数据结构正确

## Performance & Constraints
- 所有 API 端点响应时间必须 < 500ms（硬编码在测试中）
- 数据库连接需要手动初始化和关闭
- 测试环境使用完全独立的数据库实例
- JSON 字段存储复杂数据结构，需要解析处理