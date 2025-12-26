# 📊 软件项目评估系统 (PPA) - 项目分析与操作指南

**最后更新**: 2025-11-08
**项目类型**: Web应用 (前后端分离)
**主要技术栈**: React + Node.js + SQLite3

---

## 🎯 项目概述

**软件项目评估系统 (PPA - Project Portfolio Assessment)** 是一个专业的Web应用，旨在替代传统Excel表格，对软件项目进行系统化、在线化的成本和风险评估。系统提供实时计算、模板化管理和专业报告导出功能。

### 核心价值
- **统一算法**: 替代分散的Excel和主观经验，提供标准化评估流程
- **风险量化**: 通过评分因子驱动成本调节，提高议价空间控制
- **模板化复用**: 加速多项目评估，减少重复输入
- **数据沉淀**: 历史数据统一管理，支持后续分析

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────┐
│         前端 (React + Ant Design)    │
│              端口: 8000              │
├─────────────────────────────────────┤
│         后端 (Node.js + Express)     │
│              端口: 3001              │
├─────────────────────────────────────┤
│         数据库 (SQLite3)             │
│            ppa.db                   │
└─────────────────────────────────────┘
```

### 前端技术栈
- **框架**: React
- **UI库**: Ant Design Pro
- **构建工具**: Yarn
- **运行端口**: http://localhost:8000

### 后端技术栈
- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite3
- **关键依赖**:
  - `express-validator`: 数据验证
  - `exceljs`: Excel文件导出
  - `pdfkit`: PDF报告生成
  - `sinon`: 测试框架
- **运行端口**: http://localhost:3001

### 核心特性
- **实时评估计算**: 后端统一算法，确保口径一致
- **动态参数配置**: 风险项/角色/差旅费用在线维护
- **风险驱动成本调节**: 评分→因子→成本放缩
- **结构化持久化**: 评估详情JSON全量存储
- **专业导出**: PDF & Excel一键生成

---

## 🚀 构建与运行

### 后端启动
```bash
# 进入后端目录
cd server

# 安装依赖
npm install

# 初始化数据库表结构
node init-db.js

# 初始化基础数据（角色、差旅成本等）
cd seed-data
node seed-all.js
cd ..

# 启动后端服务器 (运行于 http://localhost:3001)
node index.js
```

### 前端启动
```bash
# 进入前端目录
cd frontend/ppa_frontend

# 安装依赖
yarn

# 启动前端开发服务器 (运行于 http://localhost:8000)
yarn start
```

### 测试命令
```bash
# 后端测试
cd server
npm test
```

---

## 📁 核心功能模块

### 1. 数据看板 (`/dashboard`)
- **URL路径**: `http://localhost:8000/dashboard`
- **功能**: 项目总体成本构成、风险分布可视化
- **技术实现**: 后端聚合API + 前端图表组件

### 2. 项目评估 (`/assessment`)
- **新建评估** (`/assessment/new`):
  - 分步式向导：风险→开发工作量→系统对接→维护/差旅/风险成本→总结
  - 实时计算支持：填写表单时调用 `/api/calculate` 返回动态成本拆解
  - 风险评分自动映射为评分因子，影响开发&集成成本
  - 模板复用：可从模板预填所有结构化字段

- **历史项目** (`/assessment/history`):
  - 项目列表展示和搜索筛选
  - 编辑/删除功能
  - 模板标识区分显示

- **项目详情** (`/assessment/detail/:id`):
  - 结构化评估明细回显
  - 导出：PDF (`/api/projects/:id/export/pdf`)、Excel (`/api/projects/:id/export/excel`)

### 3. 参数配置 (`/config`)
- **角色管理**: `/api/config/roles` CRUD
- **风险评估项管理**: `/api/config/risk-items` CRUD
- **差旅成本配置**: `/api/config/travel-costs` CRUD
- **聚合获取**: `/api/config/all` 一次返回全部配置

### 4. 导出与报告
- **PDF导出**: 服务端聚合评估详情+成本拆解
- **Excel导出**: 详细的成本和工作量分析
- **数据一致性**: 导出数据与计算结果保持一致

---

## 💾 数据库模型

### 核心表结构

#### 1. projects (项目表)
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_template BOOLEAN NOT NULL DEFAULT 0,
    final_total_cost REAL,          -- 最终总成本（万元）
    final_risk_score INTEGER,       -- 风险总分
    final_workload_days REAL,       -- 总工作量天数
    assessment_details_json TEXT,   -- 评估详情JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. config_roles (角色配置表)
```sql
CREATE TABLE config_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    unit_price REAL NOT NULL,       -- 单价（元/人/天）
    is_active BOOLEAN DEFAULT 1
);
```

#### 3. config_risk_items (风险配置表)
```sql
CREATE TABLE config_risk_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    options_json TEXT NOT NULL,     -- 风险选项JSON
    is_active BOOLEAN DEFAULT 1
);
```

#### 4. config_travel_costs (差旅配置表)
```sql
CREATE TABLE config_travel_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    cost_per_month REAL,            -- 月度成本
    is_active BOOLEAN DEFAULT 1
);
```

---

## 🔌 API接口

### 核心API端点

#### 健康检查
- `GET /api/health` - 系统健康状态
- `GET /` - 根路径

#### 计算服务
- `POST /api/calculate` - 实时评估计算
- **计算结果字段**:
  ```json
  {
    "software_dev_cost": "软件开发成本",
    "system_integration_cost": "系统集成成本", 
    "travel_cost": "差旅成本",
    "maintenance_cost": "维护成本",
    "risk_cost": "风险成本",
    "total_cost": "总成本",
    "total_workload_days": "总工作量",
    "risk_score": "风险评分",
    "rating_factor": "评分因子"
  }
  ```

#### 项目管理
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建新项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `POST /api/projects/:id/export/pdf` - PDF导出
- `POST /api/projects/:id/export/excel` - Excel导出

#### 模板管理
- `GET /api/templates` - 获取模板列表
- `POST /api/templates` - 创建模板
- `GET /api/templates/:id` - 获取模板详情
- `PUT /api/templates/:id` - 更新模板

#### 配置管理
- `GET /api/config/roles` - 角色配置
- `POST /api/config/roles` - 创建角色
- `PUT /api/config/roles/:id` - 更新角色
- `DELETE /api/config/roles/:id` - 删除角色
- `GET /api/config/risk-items` - 风险配置
- `GET /api/config/travel-costs` - 差旅配置
- `GET /api/config/all` - 全部配置聚合

#### 数据看板
- `GET /api/dashboard/overview` - 数据看板概览
- `GET /api/dashboard/trend` - 月度趋势
- `GET /api/dashboard/cost-range` - 成本区间
- `GET /api/dashboard/keywords` - 词云分析
- `GET /api/dashboard/dna` - 项目DNA
- `GET /api/dashboard/top-roles` - 角色排名
- `GET /api/dashboard/top-risks` - 风险排名

---

## 🎲 评分因子机制

### 计算逻辑
根据风险得分/最大可达风险分值计算比例，再按阈值区间插值获得放缩因子：

- **低于0.8**: 因子 = 1.0
- **0.8~1.0**: 线性增至1.2  
- **1.0~1.2**: 继续增至封顶1.5

### 评分公式
```
风险比例 = 实际风险得分 / 最大可能风险得分
评分因子 = interpolate(风险比例, [0.8->1.0, 1.0->1.2, 1.2->1.5])
最终成本 = 基础成本 × 评分因子
```

### 成本组成
- **软件开发成本**: 开发工作量 × 角色单价 × 评分因子
- **系统集成成本**: 集成工作量 × 角色单价 × 评分因子  
- **维护成本**: 维护工作量 × 角色单价
- **差旅成本**: 月度差旅 × 项目周期
- **风险成本**: 根据风险等级预设

---

## 📂 关键文件结构

### 后端核心文件
```
server/
├── index.js                    # 主服务器入口
├── init-db.js                 # 数据库初始化
├── package.json               # 依赖配置
├── routes/                    # 路由模块
│   ├── index.js              # 路由聚合
│   ├── health.js             # 健康检查
│   ├── calculation.js        # 计算服务
│   ├── config.js             # 配置管理
│   ├── projects.js           # 项目管理
│   └── dashboard.js          # 数据看板
├── controllers/              # 业务逻辑
├── models/                   # 数据模型
├── middleware/               # 中间件
├── services/                 # 业务服务
├── utils/                    # 工具函数
├── tests/                    # 测试文件
└── seed-data/                # 种子数据
```

### 前端核心文件
```
frontend/ppa_frontend/
├── src/
│   ├── components/           # React组件
│   ├── pages/               # 页面组件
│   ├── services/            # API服务
│   └── utils/               # 工具函数
├── package.json             # 依赖配置
└── public/                  # 静态资源
```

### 核心文档
```
docs/
├── PRD.md                   # 产品需求文档
├── project-overview.md      # 项目概览
├── tech-spec.md             # 技术规格
├── user-manual.md           # 用户手册
├── bmm-workflow-status.md   # 开发状态
├── epics.md                 # 史诗故事
├── prd/                     # 需求详细文档
├── stories/                 # 用户故事
├── bugfix/                  # Bug修复记录
├── csv/                     # 数据样本
└── test/                    # 测试相关
```

---

## 🔧 开发规范

### 代码风格
- **后端**: Node.js + Express架构，严格的路由分层
- **前端**: React + Ant Design Pro，组件化开发
- **数据库**: SQLite3，统一表结构设计
- **API设计**: RESTful风格，统一响应格式

### 项目状态
- **当前分支**: feat_agent
- **已完成的里程碑**: M0-M7 (全部完成)
- **开发状态**: 功能完善，Bug修复阶段

### 测试覆盖
- **后端测试**: Jest + Supertest
- **数据库测试**: SQLite3内存模式
- **API测试**: 完整的端到端测试

---

## 🎯 后续规划

### 短期计划
1. **用户权限系统**: 多用户评估与审计
2. **成本版本管理**: 差异追踪与历史对比
3. **Dashboard增强**: 趋势分析和模板使用统计

### 长期规划  
1. **自动化测试**: 提升回归测试覆盖率
2. **性能优化**: 大数据量处理优化
3. **扩展性**: 支持更多评估模型和计算规则

---

## 📋 使用指南

### 快速开始
1. 启动后端服务器 (`cd server && node index.js`)
2. 启动前端开发服务器 (`cd frontend/ppa_frontend && yarn start`)  
3. 访问 `http://localhost:8000`

### 核心流程
1. **参数配置**: 设置角色单价、风险项、差旅标准
2. **风险评估**: 选择项目风险项，系统计算评分因子
3. **工作量估算**: 分配各角色工作量和功能模块
4. **成本计算**: 实时计算总成本和成本构成
5. **保存导出**: 保存项目或导出PDF/Excel报告

### 模板使用
- 将常用评估保存为模板
- 从模板快速创建新项目
- 模板化提升评估效率

---

## ⚠️ 注意事项

1. **数据库文件**: `server/ppa.db` 包含所有项目数据，备份重要
2. **端口占用**: 前端8000端口，后端3001端口，避免冲突
3. **环境配置**: 开发环境默认配置，生产环境需要调整
4. **数据一致性**: 前后端计算逻辑保持一致，避免偏差
5. **文件导出**: 大量数据导出时注意内存使用

---

**项目已实现所有核心功能，可投入生产使用。当前处于优化和维护阶段。**