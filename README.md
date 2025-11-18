# 软件项目评估系统 (PPA - Project Portfolio Assessment)

一个Web应用，用于替代传统的Excel表格，对软件项目进行系统化、在线化的成本和风险评估。

## ✨ 核心亮点

- **AI 模型深度集成**  
  - 内置风险 AI 自动评估、模块分析与一键工作量评估能力，覆盖“风险评分→模块梳理→工时建议”的完整链路。  
  - 通过 `/model-config` 页面管理模型配置与提示词模板，支持多模型、多场景的提示词精细调优，并在 `docs/prd/` 中为每个 AI 功能提供独立 PRD 与调试说明。  
  - 后端统一封装 `ai*Service`，配合 AI 请求/响应文件级日志（`server/services/aiFileLogger.js`、`server/logs/ai/**`），方便问题回放与效果对比。

- **独有的项目评估与报价算法**  
  - 将传统 Excel 里的人工估算拆解为结构化模型：风险评分、角色工作量、差旅与运维、风险成本等输入，通过统一 API `POST /api/calculate` 计算报价。  
  - 核心算法将角色单价（元/人/天）统一换算为万元，再叠加交付系数 (`delivery_factor`)、范围系数 (`scope_factor`)、技术系数 (`tech_factor`) 以及动态评分因子 (`ratingFactor`)，形成可解释、可追踪的报价因子体系。  
  - 差旅、运维、风险成本均来自配置与表单数据（如 `config_travel_costs`、`maintenance_*` 字段），最终生成“软件研发 / 系统对接 / 差旅 / 运维 / 风险”五大成本构成与总报价，并在保存项目时于后端再次完整重算，保证数据一致性与防篡改。  
  - 详细公式推导、样例数据与边界用例见 `docs/prd/calculation-logic-spec.md`。

## 💻 功能概览

- **分步式评估向导**: 清晰地引导用户完成风险、工作量、其他成本的录入。
- **动态参数配置**: 支持用户在UI上自定义评估模型所需的所有核心参数（角色单价、风险项等）。
- **模板化**: 支持将评估保存为模板，并能从模板快速创建新评估，提升效率。
- **数据可视化**: 提供Dashboard，直观展示项目成本构成、风险分布等关键指标。
- **AI 辅助评估**: 结合上述 AI 能力，在关键步骤给出辅助结论与建议，减少纯手工输入与主观偏差。
- **增强报告导出**: 支持 PDF 与 Excel 导出，Excel 提供内部版 / 外部版两种模板，并记录导出日志便于审计与排查。

## 🚀 技术栈

- **前端**: React (Ant Design Pro)
- **后端**: Node.js (Express)
- **数据库**: SQLite3

## 📦 快速启动

### 1. 后端

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

### 2. 前端

```bash
# 进入前端目录
cd frontend/ppa_frontend

# 安装依赖
yarn

# 启动前端开发服务器 (运行于 http://localhost:8000)
yarn start
```

## 📚 文档导航

- **产品需求与设计**: `docs/PRD.md`、`docs/prd/` 下的详细特性说明（含 AI 风险评估、工作量一键评估等扩展能力）。
- **技术架构与后端 API**: `server/README.md`、`server/ARCHITECTURE.md`。
- **项目整体分析与操作指南**: `IFLOW.md`（中文版项目分析）、`GEMINI.md`（英文项目概览）。
- **开发者与代理工具指南**: `WARP.md`、`AGENTS.md` 以及 `bmad/` 目录（BMM workflows 与辅助工具配置）。
- **缺陷与修复记录**: `docs/bugfix/` 目录（含各 Sprint 的后端/前端问题与修复说明，以及 AI 相关 bugfix 记录）。

## 📝 里程碑

- ✅ **M0: 数据初始化**
- ✅ **M1: 地基与环境搭建**
- ✅ **M2: 核心评估流程实现 (参数配置)**
- ✅ **M3 & M4: 核心评估流程实现 (评估主流程)**
- ✅ **M5: 支撑模块与效率功能完善**
- ✅ **M6 & M7: Bug修复、测试与优化**

## 🧪 AI 日志与调试

为便于后续回放与对比，后端会在调用 AI 模型（风险评分、名称归一、模块梳理）时将完整的请求/响应/解析结果写入文件。

- 默认开启，无需配置。
- 日志目录：`server/logs/ai/{step}/YYYY-MM-DD/{HHmmss}_{requestHash}/`
- 文件包含：`index.json`、`request.json`、`response.raw.txt`、`response.parsed.json`、`notes.log`
- 成功写入后控制台会打印：`[AI File Logger] saved to: ...`

可选环境变量（启动后端时传入）：

```bash
# 显式开启/关闭
AI_LOG_ENABLED=true node index.js

# 自定义日志目录
AI_LOG_ENABLED=true AI_LOG_DIR=/absolute/path/to/logs node index.js

# 导出日志开关与目录（详见 server/README.md）
EXPORT_LOG_ENABLED=true EXPORT_LOG_DIR=/absolute/path/to/export/logs node index.js
```

更多说明见：`docs/bugfix/AI-LOGGING-NOTES.md`
