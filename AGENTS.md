# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
项目评估系统 (Project Assessment System) - 一个基于 UMI Max + Ant Design 的前端应用，后端使用 SQLite 数据库的项目评估管理平台。

## Tech Stack
- **Frontend**: UMI Max (React), Ant Design, TypeScript
- **Backend**: Node.js + Express, SQLite 数据库
- **Build Tools**: UMI Max (前端构建), npm/yarn

## Key Commands
- 前端开发: `cd frontend/ppa_frontend && npm run dev` (端口 8000)
- 前端构建: `cd frontend/ppa_frontend && npm run build`
- 后端启动: `cd server && node index.js` (端口 3001)
- 数据库初始化: `cd server && node init-db.js`

## Non-Obvious Patterns
- 后端使用端口 3001，避免与常见的前端 3000 冲突
- 前端代理配置 `/api` 到 `http://localhost:3001`
- SQLite 数据库文件 `ppa.db` 自动创建，无需手动配置
- 项目使用 yarn 作为包管理器（前端 package.json 中指定）