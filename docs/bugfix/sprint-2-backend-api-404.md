
# Sprint #2 问题报告：后端 API 404 Not Found

*   **领域:** 后端 / 联调
*   **时间:** Sprint #2 开发期间

## 1. 问题描述

在开发“参数配置-角色管理”功能时，前端页面（`ProTable`）发起对 `/api/config/roles` 的GET请求，但遇到了 `404 (Not Found)` 错误，并伴随 `SyntaxError: Unexpected token '<'` 的前端JSON解析错误。

## 2. 排查过程

1.  **初步诊断 (错误):** 最初怀疑是前端代理配置未生效。
2.  **后端健康检查:** 使用 `curl http://localhost:3001/api/health` 测试，`/api/health` 接口可正常访问，这加深了对“代理问题”的错误判断。
3.  **关键测试:** 使用 `curl http://localhost:3001/api/config/roles` **直接测试后端的目标API**，发现后端返回了 `Cannot GET /api/config/roles` 的错误。

## 3. 根本原因

上述关键测试证明，问题不在前端代理，而在于 **后端服务器本身**。

在 `server/index.js` 文件中添加了新的API路由后，**没有重启后端 `node` 服务器进程**。因此，正在运行的服务器实例加载的仍然是旧的、不包含新API的代码。

## 4. 解决方案

1.  **终止旧进程:** 使用 `pkill -f "node index.js"` 或 `kill <PID>` 命令，确保所有旧的后端服务器进程都被终止。
2.  **重启服务器:** 重新在 `server` 目录下执行 `node index.js`，启动一个加载了最新代码的新实例。

**核心教训:** 每次修改后端代码后，都必须重启后端开发服务器。
