# 软件项目评估系统 (PPA - Project Portfolio Assessment)

一个Web应用，用于替代传统的Excel表格，对软件项目进行系统化、在线化的成本和风险评估。

## ✨ 功能特性

- **分步式评估向导**: 清晰地引导用户完成风险、工作量、其他成本的录入。
- **动态参数配置**: 支持用户在UI上自定义评估模型所需的所有核心参数（角色单价、风险项等）。
- **模板化**: 支持将评估保存为模板，并能从模板快速创建新评估，提升效率。
- **数据可视化**: 提供Dashboard，直观展示项目成本构成、风险分布等关键指标。
- **报告导出**: 支持将评估结果导出为专业的PDF或可供分析的Excel文件。

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
```

更多说明见：`docs/bugfix/AI-LOGGING-NOTES.md`
