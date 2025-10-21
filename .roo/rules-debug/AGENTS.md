# Project Debug Rules (Non-Obvious Only)

## Debugging Challenges
- 后端数据库连接问题可能导致前端报错，需要检查 SQLite 数据库文件 `ppa.db` 是否存在
- 前端代理配置问题可能导致 API 调用失败，检查 `.umirc.ts` 中的 proxy 配置
- 开发时同时运行前后端服务（前端 8000，后端 3001），端口冲突可能导致连接问题
- SQLite 数据库初始化失败会影响整个应用，需要先运行 `init-db.js` 脚本

## Common Issues
- 数据库连接错误通常显示为 "Database connection failed"，检查后端服务是否运行
- 前端代理错误可能显示为 CORS 或网络错误，确认后端服务运行在 3001 端口