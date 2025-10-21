# Server 目录说明

## 目录结构

```
server/
├── index.js           # 后端服务主文件 (端口 3001)
├── init-db.js         # 数据库表结构初始化脚本
├── ppa.db            # SQLite 数据库文件（自动生成）
├── package.json       # 项目依赖配置
└── seed-data/         # 📁 数据初始化脚本目录
    ├── README.md              # 数据初始化详细说明
    ├── seed-all.js            # 一键初始化所有数据
    ├── seed-roles.js          # 角色数据初始化
    ├── seed-travel-costs.js   # 差旅成本初始化
    └── seed-risk-items.js     # 风险评估项初始化
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
# 创建数据库表结构
node init-db.js

# 初始化基础数据（一键运行）
cd seed-data
node seed-all.js
```

或者单独运行各个初始化脚本：

```bash
cd seed-data
node seed-roles.js          # 初始化角色数据
node seed-travel-costs.js   # 初始化差旅成本
node seed-risk-items.js     # 初始化风险评估项
```

### 3. 启动服务

```bash
# 返回 server 目录
cd ..
# 启动后端服务
node index.js
```

服务将在 http://localhost:3001 启动。

## API 端点

- `GET /api/health` - 健康检查
- `GET /api/config/roles` - 获取角色配置
- `GET /api/config/travel-costs` - 获取差旅成本配置
- `GET /api/config/risk-items` - 获取风险评估项配置
- 更多 API 请查看 `index.js`

## 数据管理

所有数据初始化相关的脚本和文档都在 `seed-data/` 目录中。

详细说明请查看：[seed-data/README.md](./seed-data/README.md)

## 注意事项

- 后端使用端口 3001，避免与前端 3000 端口冲突
- SQLite 数据库文件 `ppa.db` 会自动创建
- 初始化脚本会清空现有数据，请谨慎使用
