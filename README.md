# PPA - Project Portfolio Assessment

PPA（项目组合评估系统）是一个 Web 应用，用于替代 Excel 表格，对软件项目进行系统化的成本与风险评估。支持分步评估向导、AI 辅助分析、报价计算、模板复用、数据看板和 PDF/Excel 导出。

当前版本已进入 **V2**：在保留 V1 单项目评估能力的基础上，正在向云端数据底座、机会情报、多人评估和 SaaS 平台化方向演进。

---

## 技术栈

### 前端
- React 18 + UmiJS Max 4 + TypeScript
- Ant Design 5 + ProComponents
- Yarn 包管理器

### 后端
- Node.js + Express 5
- SQLite3（本地开发）/ PostgreSQL（V2 云端模式）
- Jest + Supertest

### AI & 工具
- OpenAI API、豆包(Doubao) API
- PDFKit、ExcelJS
- Python 爬虫（spider/ 目录）

---

## 技术架构

### 后端三层架构

```
Routes（路由层）→ Controllers（控制器）→ Services（业务层）→ Models（数据层）
```

- **Routes**：定义 URL 路由，11 个模块（ai、calculation、config、projects、dashboard 等）
- **Controllers**：参数提取、响应格式化
- **Services**：核心业务逻辑（计算引擎、AI 服务、导出服务等）
- **Models**：数据访问层（直接 SQLite 操作）

### 核心模块

- **报价计算引擎**：`POST /api/calculate` 将角色单价换算为万元，叠加交付系数、范围系数、技术系数和动态评分因子
- **AI 辅助服务**：风险自动评估、模块拆解、工作量建议、项目标签生成
- **数据看板**：项目数量、成本区间、趋势、关键词、DNA 雷达等可视化

---

## 快速启动

### 后端

```bash
cd server
npm install
node init-db.js                      # 初始化数据库（幂等）
cd seed-data && node seed-all.js && cd ..  # 初始化基础数据
node index.js                        # 启动服务 http://localhost:3001
```

### 前端

```bash
cd frontend/ppa_frontend
yarn install                         # 必须用 yarn
yarn start                           # 启动开发服务器 http://localhost:8000
```

启动后访问 `http://localhost:8000`，前端通过 UmiJS proxy 将 `/api` 请求代理到后端 `localhost:3001`。

---

## 文档导航

### 开发指南
- **开发规范**：[CLAUDE.md](./CLAUDE.md) — AI 协作开发约束、关键路径、已知技术债
- **详细开发指南**：[docs/development-guide.md](./docs/development-guide.md) — 包管理、代码规范、测试、调试
- **技术架构详解**：[docs/architecture.md](./docs/architecture.md) — 完整架构设计、数据流、模块边界

### 产品文档
- **V2 主 PRD**：[docs/prd2.0/prd.md](./docs/prd2.0/prd.md)
- **V1 历史需求**：[docs/prd/](./docs/prd)
- **API 文档**：启动后端后访问 `http://localhost:3001/api-docs`

### 测试与运维
- **测试工作区**：[tests/README.md](./tests/README.md)
- **后端说明**：[server/README.md](./server/README.md)

---

## 项目结构

```
PPA/
├── server/                     # 后端 API、服务、模型、迁移
├── frontend/ppa_frontend/      # 前端 UmiJS + React + Ant Design
├── tests/                      # 项目级测试工作区
├── docs/                       # 产品文档、PRD、架构文档
├── spider/                     # Python 爬虫（招标网站数据采集）
└── _bmad/                      # BMAD 方法框架配置
```

---

## 贡献

欢迎提交 Issue 和 Pull Request！首次贡献请先阅读 [docs/development-guide.md](./docs/development-guide.md)。
