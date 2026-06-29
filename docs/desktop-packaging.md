# PPA 桌面应用打包方案

> **版本**：v1.0  
> **更新日期**：2026-06-29  
> **状态**：方案讨论阶段

---

## 📋 目录

1. [方案概述](#方案概述)
2. [为什么选择桌面应用](#为什么选择桌面应用)
3. [技术架构](#技术架构)
4. [打包原理](#打包原理)
5. [实施步骤](#实施步骤)
6. [成本分析](#成本分析)
7. [风险评估](#风险评估)
8. [FAQ](#faq)

---

## 方案概述

### 背景

PPA（项目组合评估系统）目前是一个 Web 应用，需要服务器部署。但实际使用场景是：
- **单用户/小团队使用**（<10 人）
- **易于传播比性能更重要**（给客户演示）
- **数据隐私性要求高**（项目数据敏感）
- **不想花时间运维服务器**（零成本、低维护）

### 方案选择

**推荐方案：打包成 Electron 桌面应用**

```
数据库：Supabase（云端）
文件存储：本地磁盘（用户电脑）
前端：打包进 Electron（本地静态文件）
后端：打包进 Electron（本地 Node.js）
```

### 核心优势

| 优势 | 说明 |
|------|------|
| ✅ **零成本** | 不需要服务器、域名、运维 |
| ✅ **易于传播** | 直接发安装包，双击即可使用 |
| ✅ **数据本地** | 文件存储在用户电脑，隐私性好 |
| ✅ **易于维护** | 应用即服务，一键启动 |

---

## 为什么选择桌面应用

### vs 服务器部署

| 维度 | 服务器部署 | 桌面应用 | 你的场景 |
|------|-----------|---------|---------|
| **成本** | $10-20/月 | **$0**（一次性打包） | ✅ 桌面应用 |
| **传播难度** | 需要域名、配置 | **直接发安装包** | ✅ 桌面应用 |
| **维护成本** | 需要运维、监控 | **几乎为零** | ✅ 桌面应用 |
| **数据隐私** | 数据在服务器 | **数据在本地** | ✅ 桌面应用 |
| **离线可用** | ❌ 必须联网 | ✅ **AI 功能除外** | ✅ 桌面应用 |

### vs SaaS 方案

| 维度 | SaaS 方案 | 桌面应用 |
|------|----------|---------|
| **用户体验** | 打开浏览器就用 | **需要安装** |
| **数据隐私** | 云端存储 | **本地存储** |
| **传播成本** | 发 URL | **发安装包** |
| **定制化** | 难 | **易** |

### 适用场景

✅ **适合**：
- 单用户/小团队使用（<10 人）
- 偶尔给客户演示
- 数据隐私性要求高
- 不想花钱买服务器

❌ **不适合**：
- 多人协作（>10 人）
- 公开发布给互联网用户
- 需要实时协作
- 高频功能迭代（每周 >1 次）

---

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│           PPA 桌面应用（Electron）                    │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  渲染进程（Renderer Process）                  │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  前端（React + UmiJS 构建产物）            │  │  │
│  │  │  • 加载本地静态文件（app.asar）            │  │  │
│  │  │  • 通过 HTTP 调用本地后端                  │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └──────────────────┬──────────────────────────────┘  │
│                     │ HTTP (localhost:3001)           │
│  ┌──────────────────▼──────────────────────────────┐  │
│  │  主进程（Main Process）                         │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Node.js + Express 后端                   │  │  │
│  │  │  • 启动端口 3001                          │  │  │
│  │  │  • 连接 Supabase PostgreSQL               │  │  │
│  │  │  • 文件访问（本地磁盘）                    │  │  │
│  │  │  • AI 调用（OpenAI/Doubao）                │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  本地文件系统（userData/）                            │
│  ├── ppa.db（SQLite 数据库）                          │
│  ├── uploads/（项目附件、合同文件）                    │
│  └── config.json（应用配置）                          │
└─────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
                 ┌──────────────────┐
                 │   Supabase       │
                 │   PostgreSQL     │
                 └──────────────────┘
```

### 数据流

```
用户操作
  ↓
前端（React）
  ↓ HTTP
后端（Express）
  ↓
├─→ 读取/写入本地文件（uploads/）
├─→ 读写本地数据库（userData/ppa.db 或 Supabase）
├─→ AI 调用（OpenAI/Doubao API）
└─→ 返回数据给前端
  ↓
前端展示
```

### 目录结构

```
PPA/
├── server/                 # 后端代码（不变）
│   ├── index.js            # Express 入口
│   ├── config/             # 配置层
│   ├── controllers/        # 控制器
│   ├── services/           # 业务层
│   ├── models/             # 数据层
│   └── ...
│
├── frontend/               # 前端代码（不变）
│   └── ppa_frontend/
│       ├── src/            # 源码
│       └── dist/           # 构建产物（~5-10MB）
│
├── desktop/                # Electron 打包目录（新增）
│   ├── main.js             # Electron 主进程
│   ├── preload.js          # 预加载脚本（安全层）
│   ├── package.json        # Electron 项目配置
│   └── build/              # 打包配置
│       └── electron-builder.json
│
└── docs/
    └── desktop-packaging.md # 本文档
```

---

## 路径处理与代码修改指南

### 核心原则：编译 vs 打包

**Electron 不会编译你的代码，只是打包！**

| 项目 | 是否需要编译 | 是否需要打包 | 说明 |
|------|------------|------------|------|
| **前端（React + UmiJS）** | ✅ **需要构建** | ✅ 打包进 asar | `yarn build` 生成静态文件 |
| **后端（Node.js + Express）** | ❌ **不需要** | ✅ 打包进 asar | 直接打包源码，Node.js 是解释型语言 |

**关键理解**：
```
你的代码（源码）
  ↓
electron-builder
  ↓
app.asar（仍然是源码，只是归档了）
```

**Electron 只是把文件打包成 asar 归档，不会编译、不会转译、不会修改代码。**

---

### 前端路径：不需要修改

#### 为什么不需要改？

1. **UmiJS 构建时已处理好所有路径**
   - `yarn build` 生成的是**完整的静态文件**
   - 所有资源路径都是**相对路径或绝对路径**
   - 与部署环境无关

2. **示例：UmiJS 构建后的 index.html**
   ```html
   <!-- 相对路径，自动解析 -->
   <link href="/umi.css" rel="stylesheet">
   <script src="/umi.js"></script>
   <img src="/logo.png" alt="Logo">
   ```

3. **Electron 加载方式不影响路径**
   ```javascript
   // 方式 1：加载本地文件
   mainWindow.loadFile('dist/index.html');
   
   // 方式 2：加载本地服务器
   mainWindow.loadURL('http://localhost:3001');
   ```

无论哪种方式，前端的静态资源路径**都不需要修改**。

---

### 后端路径：必须修改

#### 问题根源：`app.asar` 是只读的

**当前代码的问题**：
```javascript
// server/services/attachmentService.js
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'project-attachments');
```

**为什么有问题**：
- `__dirname` 在开发环境 = `/Users/maylis/.../server/`（可读写）
- `__dirname` 在打包后 = `app.asar` 内部路径（**只读！**）

**打包后的文件结构**：
```
PPA.app
└── Resources/
    └── app.asar（只读！）
        ├── main.js
        ├── server/
        │   ├── index.js
        │   ├── services/
        │   │   └── attachmentService.js
        │   └── uploads/  ← ❌ 无法写入！
        └── ...
```

#### 正确的解决方案

使用 Electron 的 `app.getPath('userData')` 获取**用户数据目录**（可读写）：

```javascript
// ✅ 正确的写法
const UPLOAD_DIR = process.env.UPLOAD_DIR || 
  path.join(__dirname, '..', 'uploads', 'project-attachments');

// 在 Electron 主进程中设置环境变量
process.env.UPLOAD_DIR = path.join(app.getPath('userData'), 'uploads');
```

**不同平台的 userData 目录**：

| 平台 | 路径 | 说明 |
|------|------|------|
| **macOS** | `~/Library/Application Support/PPA/` | 用户数据目录 |
| **Windows** | `C:\Users\<用户名>\AppData\Roaming\PPA\` | 漫游配置 |
| **Linux** | `~/.config/PPA/` | XDG 配置目录 |

**优势**：
- ✅ **可读写**：用户可以正常上传文件
- ✅ **持久化**：卸载应用不会丢失数据
- ✅ **符合规范**：遵循各平台的应用数据存储规范

---

### 需要修改的文件清单

#### ✅ 必须修改（3 个文件）

| 文件 | 修改内容 | 原因 | 优先级 |
|------|---------|------|--------|
| **`server/services/attachmentService.js`** | 使用 `process.env.UPLOAD_DIR` | 项目附件存储路径 | 🔴 高 |
| **`server/services/biddingSiteScriptStorage.js`** | 使用 `process.env.BIDDING_SITE_SCRIPT_DIR` | 投标脚本存储路径 | 🔴 高 |
| **`desktop/main.js`** | 设置环境变量 | Electron 主进程配置 | 🔴 高 |

#### ⚠️ 建议修改（2 个文件）

| 文件 | 修改内容 | 原因 | 优先级 |
|------|---------|------|--------|
| **`server/utils/logger.js`** | 使用 `process.env.EXPORT_LOG_DIR` | 导出日志路径 | 🟡 中 |
| **`server/config/database.js`** | 使用 `process.env.DB_PATH` | 本地 SQLite 路径 | 🟡 中 |

#### ❌ 不需要修改（自动处理）

| 文件/配置 | 原因 |
|----------|------|
| **前端代码** | UmiJS 构建时已处理好路径 |
| **后端路由** | 路径都是逻辑路径（`/api/projects`），与文件系统无关 |
| **API 接口** | 仍然是 `http://localhost:3001` |
| **数据库查询** | SQL 语句与路径无关 |
| **第三方依赖** | 自动打包进 asar 或 unpacked |

---

### 详细修改示例

#### 1. `server/services/attachmentService.js`

**修改前**：
```javascript
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'project-attachments');
const ATTACHMENT_META_SUFFIX = '.meta.json';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}
```

**修改后**：
```javascript
// 优先使用环境变量（Electron 桌面应用）
// 降级使用相对路径（开发环境）
const UPLOAD_DIR = process.env.UPLOAD_DIR || 
  path.join(__dirname, '..', 'uploads', 'project-attachments');
const ATTACHMENT_META_SUFFIX = '.meta.json';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}
```

**变化**：只在第 4 行添加了 `process.env.UPLOAD_DIR ||`，其他代码完全不变。

---

#### 2. `server/services/biddingSiteScriptStorage.js`

**修改前**：
```javascript
const DEFAULT_SCRIPT_DIR = path.join(__dirname, '..', 'uploads', 'bidding-site-scripts');

function getScriptStorageDir() {
  return process.env.BIDDING_SITE_SCRIPT_DIR || DEFAULT_SCRIPT_DIR;
}
```

**修改后**：
```javascript
// 使用环境变量，降级到默认路径
const DEFAULT_SCRIPT_DIR = process.env.BIDDING_SITE_SCRIPT_DIR ||
  path.join(__dirname, '..', 'uploads', 'bidding-site-scripts');

function getScriptStorageDir() {
  return DEFAULT_SCRIPT_DIR;
}
```

**注意**：这个文件已经使用了 `process.env.BIDDING_SITE_SCRIPT_DIR`，但降级逻辑需要调整。

---

#### 3. `desktop/main.js`（Electron 主进程）

**关键代码段**：
```javascript
const { app } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  // ═══════════════════════════════════════════
  // 设置可写路径（必须在启动后端之前）
  // ═══════════════════════════════════════════
  
  // 文件上传目录
  process.env.UPLOAD_DIR = path.join(
    app.getPath('userData'), 
    'uploads', 
    'project-attachments'
  );
  
  // 投标脚本目录
  process.env.BIDDING_SITE_SCRIPT_DIR = path.join(
    app.getPath('userData'), 
    'uploads', 
    'bidding-site-scripts'
  );
  
  // 导出日志目录
  process.env.EXPORT_LOG_DIR = path.join(
    app.getPath('userData'), 
    'logs', 
    'export'
  );
  
  // 本地数据库路径（如果使用 SQLite）
  process.env.DB_PATH = path.join(
    app.getPath('userData'), 
    'ppa.db'
  );
  
  // 启动后端（此时环境变量已设置）
  startBackend();
  
  setTimeout(createWindow, 1000);
});
```

---

#### 4. `server/utils/logger.js`（可选）

**修改前**：
```javascript
const logDir = path.join(__dirname, '..', 'logs', 'export');
```

**修改后**：
```javascript
const logDir = process.env.EXPORT_LOG_DIR || 
  path.join(__dirname, '..', 'logs', 'export');
```

---

#### 5. `server/config/database.js`（可选，仅使用 SQLite 时）

**修改前**：
```javascript
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'ppa.db');
```

**修改后**：
```javascript
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'ppa.db');

// 在 Electron 桌面应用中：
// process.env.DB_PATH = path.join(app.getPath('userData'), 'ppa.db')
// 所以 dbPath = ~/Library/Application Support/PPA/ppa.db（macOS）
```

---

### 其他路径问题

#### 1. 配置文件路径

如果应用需要读取/写入配置文件：

```javascript
// ❌ 错误：打包后只读
const configPath = path.join(__dirname, 'config.json');

// ✅ 正确：使用 userData
const configPath = path.join(app.getPath('userData'), 'config.json');
```

#### 2. 临时文件路径

```javascript
// ❌ 错误：可能没有写入权限
const tempFile = '/tmp/ppa-export.xlsx';

// ✅ 正确：使用系统临时目录
const tempFile = path.join(os.tmpdir(), 'ppa-export.xlsx');
```

#### 3. 日志文件路径

```javascript
// ❌ 错误：打包后只读
const logPath = path.join(__dirname, '..', 'logs', 'app.log');

// ✅ 正确：使用环境变量或 userData
const logPath = process.env.LOG_DIR || 
  path.join(app.getPath('userData'), 'logs', 'app.log');
```

---

### 开发环境 vs 生产环境对比

| 环境 | `__dirname` | `UPLOAD_DIR` | 数据库 |
|------|------------|-------------|--------|
| **开发** | `/Users/maylis/.../server/` | `server/uploads/` | Supabase 或本地 SQLite |
| **打包后（macOS）** | `app.asar`（只读） | `~/Library/Application Support/PPA/uploads/` | Supabase |
| **打包后（Windows）** | `app.asar`（只读） | `C:\Users\<用户>\AppData\Roaming\PPA\uploads\` | Supabase |
| **打包后（Linux）** | `app.asar`（只读） | `~/.config/PPA/uploads/` | Supabase |

---

### 修改检查清单

在打包前，请确认以下修改已完成：

- [ ] **`server/services/attachmentService.js`**
  - [ ] 第 4 行添加 `process.env.UPLOAD_DIR ||`
  - [ ] 测试文件上传功能

- [ ] **`server/services/biddingSiteScriptStorage.js`**
  - [ ] 修改默认路径逻辑
  - [ ] 测试脚本上传/下载功能

- [ ] **`desktop/main.js`**
  - [ ] 设置 `UPLOAD_DIR` 环境变量
  - [ ] 设置 `BIDDING_SITE_SCRIPT_DIR` 环境变量
  - [ ] 设置 `EXPORT_LOG_DIR` 环境变量

- [ ] **`server/utils/logger.js`**（可选）
  - [ ] 使用 `process.env.EXPORT_LOG_DIR`

- [ ] **`server/config/database.js`**（可选）
  - [ ] 使用 `process.env.DB_PATH`

---

### 验证修改是否成功

#### 开发环境测试

```bash
# 1. 确保开发环境正常
cd server
node index.js

# 2. 测试文件上传
curl -X POST http://localhost:3001/api/attachments/upload \
  -F "file=@test.txt"

# 3. 检查文件是否写入正确路径
ls -la server/uploads/project-attachments/
```

#### 打包后测试

```bash
# 1. 打包应用
cd desktop
npm run build:mac

# 2. 安装并启动
open dist/PPA.app

# 3. 测试文件上传
# 在应用界面操作

# 4. 检查文件是否写入 userData
# macOS:
ls -la ~/Library/Application\ Support/PPA/uploads/
# Windows:
dir "%APPDATA%\PPA\uploads\"
# Linux:
ls -la ~/.config/PPA/uploads/
```

---

## 风险应对

### 如果文件写入失败

**症状**：上传文件时提示"权限不足"或"无法写入"

**排查步骤**：
1. 检查环境变量是否设置：
   ```javascript
   console.log('UPLOAD_DIR:', process.env.UPLOAD_DIR);
   ```
2. 检查目录是否存在：
   ```javascript
   fs.access(UPLOAD_DIR, fs.constants.W_OK, (err) => {
     console.log('可写:', !err);
   });
   ```
3. 手动创建目录：
   ```javascript
   fs.mkdir(UPLOAD_DIR, { recursive: true });
   ```

### 如果打包后找不到文件

**症状**：应用启动后提示"文件不存在"

**原因**：使用了 `__dirname` 或相对路径

**解决方案**：全部改为使用环境变量或 `app.getPath('userData')`。

---

## 参考资源

- [Electron app.getPath() API](https://www.electronjs.org/docs/latest/api/app#appgetpathname)
- [Electron 环境变量](https://www.electronjs.org/docs/latest/tutorial/environment-variables)
- [Node.js path 模块](https://nodejs.org/api/path.html)

---

## 风险应对

### 如果文件写入失败

**症状**：上传文件时提示"权限不足"或"无法写入"

**排查步骤**：
1. 检查环境变量是否设置：
   ```javascript
   console.log('UPLOAD_DIR:', process.env.UPLOAD_DIR);
   ```
2. 检查目录是否存在：
   ```javascript
   fs.access(UPLOAD_DIR, fs.constants.W_OK, (err) => {
     console.log('可写:', !err);
   });
   ```
3. 手动创建目录：
   ```javascript
   fs.mkdir(UPLOAD_DIR, { recursive: true });
   ```

### 如果打包后找不到文件

**症状**：应用启动后提示"文件不存在"

**原因**：使用了 `__dirname` 或相对路径

**解决方案**：全部改为使用环境变量或 `app.getPath('userData')`。

---

## 参考资源

- [Electron app.getPath() API](https://www.electronjs.org/docs/latest/api/app#appgetpathname)
- [Electron 环境变量](https://www.electronjs.org/docs/latest/tutorial/environment-variables)
- [Node.js path 模块](https://nodejs.org/api/path.html)

---

## 打包原理

### 核心概念：Main Process vs Renderer Process

Electron 采用**多进程架构**：

| 进程 | 环境 | 职责 |
|------|------|------|
| **主进程（Main）** | Node.js | 控制应用生命周期、创建窗口、访问系统 API、运行后端代码 |
| **渲染进程（Renderer）** | Chromium | 渲染 UI、运行前端代码、与用户交互 |

**通信方式**：
- **HTTP**：前端 → 后端（`http://localhost:3001`）
- **IPC**：主进程 ↔ 渲染进程（Electron 原生通信）

---

### 核心概念：ASAR 归档格式

**ASAR**（Atom Shell Archive）是 Electron 专用的归档格式：

#### ASAR 文件结构

```
app.asar（示例：100MB）
├── Header（~10KB）
│   ├── 文件目录树（JSON）
│   └── 每个文件的元数据
│       ├── offset（文件位置）
│       ├── size（文件大小）
│       └── executable（是否可执行）
│
└── File Data（~100MB）
    ├── main.js（offset: 0）
    ├── index.js（offset: 1024）
    └── ...
```

#### ASAR 的优势

| 优势 | 说明 |
|------|------|
| **快速加载** | 单文件顺序读取，减少 I/O |
| **防止篡改** | 用户无法轻易修改代码 |
| **简化分发** | 单文件，便于管理 |
| **完整性校验** | Header 包含文件 hash |

#### 哪些文件需要 `app.asar.unpacked`？

某些文件**不能打包进 ASAR**，必须解压：

| 文件类型 | 原因 | 示例 |
|---------|------|------|
| **原生模块（.node）** | 需要动态加载 | `node_modules/sqlite3/lib/binding/*.node` |
| **二进制工具** | 需要执行权限 | Python、FFmpeg |
| **大文件（>100MB）** | ASAR 随机访问性能差 | 视频文件、大型数据库 |

---

### 打包工具：electron-builder

**electron-builder** 是目前最成熟的 Electron 打包工具。

#### 打包流程

```
源代码（~30MB）
  +
Electron 运行时（~80MB）
  ├─ Node.js（~30MB）
  └─ Chromium（~50MB）
  +
asar 打包（~10MB → ~5MB）
  +
原生模块（~5MB）
  =
总计：~100MB
```

#### 打包产物

| 平台 | 格式 | 体积 | 说明 |
|------|------|------|------|
| **macOS** | `.dmg` 或 `.app` | ~100MB | 双击安装 |
| **Windows** | `.exe`（NSIS） | ~100MB | 安装程序 |
| **Linux** | `.AppImage` | ~100MB | 可执行文件 |

---

## 实施步骤

### 阶段 1：准备项目结构（1 小时）

#### 1.1 创建 `desktop/` 目录

```bash
mkdir -p desktop/build
cd desktop
```

#### 1.2 初始化 Electron 项目

```bash
npm init -y
npm install --save-dev electron electron-builder
```

#### 1.3 创建基础文件

**`desktop/main.js`**（主进程）：
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;

// 启动 Node.js 后端
function startBackend() {
  const serverPath = path.join(__dirname, '..', 'server');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    DB_TYPE: 'postgres',
    DATABASE_URL: '你的 Supabase 连接',
    UPLOAD_DIR: path.join(app.getPath('userData'), 'uploads'),
  };

  serverProcess = spawn('node', [path.join(serverPath, 'index.js')], {
    cwd: serverPath,
    env,
  });
}

// 创建应用窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 加载前端
  mainWindow.loadURL('http://localhost:3001');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 1000); // 等待后端启动
});
```

---

### 阶段 2：配置 Supabase 连接（30 分钟）

#### 2.1 首次启动配置界面

应用首次启动时，显示配置界面：

```
┌─────────────────────────────────────┐
│  PPA 首次启动配置                   │
│                                     │
│  Supabase URL:                      │
│  [https://xxx.supabase.co    ]      │
│                                     │
│  Supabase Anon Key:                 │
│  [eyJhbGciOiJSUzI1NiIs...    ]      │
│                                     │
│  OpenAI API Key（可选）:             │
│  [sk-xxxx                    ]      │
│                                     │
│  [测试连接]  [保存并继续]            │
└─────────────────────────────────────┘
```

#### 2.2 配置存储

```javascript
// 保存到 userData/config.json
const config = {
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseKey: 'anon-key',
  aiProvider: 'openai',
  aiApiKey: '', // 可选
};
```

---

### 阶段 3：构建前端（10 分钟）

```bash
cd frontend/ppa_frontend
yarn build
# 生成 dist/ 目录（~5-10MB）

# 复制到 desktop/
cp -r dist ../desktop/
```

---

### 阶段 4：打包应用（30 分钟）

#### 4.1 配置 `package.json`

```json
{
  "name": "ppa-desktop",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.yourcompany.ppa",
    "productName": "PPA",
    "asar": true,
    "files": [
      "main.js",
      "preload.js",
      "dist/**/*"
    ],
    "mac": {
      "target": "dmg",
      "category": "public.app-category.business"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

#### 4.2 打包

```bash
cd desktop
npm run build:mac   # macOS
npm run build:win   # Windows
npm run build:linux # Linux
```

---

## 成本分析

### 开发成本

| 阶段 | 工时 | 说明 |
|------|------|------|
| **阶段 1** | 1 小时 | 创建项目结构 |
| **阶段 2** | 30 分钟 | 配置 Supabase |
| **阶段 3** | 10 分钟 | 构建前端 |
| **阶段 4** | 30 分钟 | 打包应用 |
| **测试** | 2 小时 | 测试所有功能 |
| **总计** | **~4 小时** | 1 个工作日 |

### 运行时成本

| 资源 | 成本 |
|------|------|
| **打包工具** | $0（electron-builder 开源） |
| **分发** | $0（直接发安装包） |
| **Supabase 数据库** | $0（免费版） |
| **AI API** | 按使用量（用户承担） |
| **总计** | **$0/月** |

---

## 风险评估

### 技术风险

| 风险 | 概率 | 影响 | 解决方案 |
|------|------|------|---------|
| **打包体积过大** | 中 | 中 | 压缩、剔除不必要依赖 |
| **文件访问路径问题** | 低 | 高 | 使用 `app.getPath('userData')` |
| **Supabase 连接失败** | 中 | 高 | 配置验证、错误提示 |
| **AI 调用超时** | 低 | 中 | 调整超时配置 |

### 用户体验风险

| 风险 | 概率 | 影响 | 解决方案 |
|------|------|------|---------|
| **安装包太大**（~100MB） | 高 | 中 | 提供下载链接、压缩包 |
| **用户不会安装** | 中 | 中 | 提供详细安装说明 |
| **安全软件误报** | 低 | 低 | 代码签名（macOS/Windows） |

### 维护风险

| 风险 | 概率 | 影响 | 解决方案 |
|------|------|------|---------|
| **更新成本高** | 高 | 中 | 制定发布计划（季度/月度） |
| **跨平台兼容性** | 中 | 中 | 测试矩阵（Win/macOS/Linux） |

---

## FAQ

### Q1：打包后体积为什么这么大？

Electron 应用包含：
- **Chromium 浏览器**（~50MB）
- **Node.js 运行时**（~30MB）
- **你的代码**（~10-20MB）

总计 ~100MB 是正常的。

### Q2：可以在线更新吗？

可以，使用 `electron-updater` 实现自动更新。

### Q3：如何处理文件上传？

使用 `app.getPath('userData')` 获取用户数据目录：
```javascript
const path = require('path');
const uploadDir = path.join(app.getPath('userData'), 'uploads');
```

### Q4：SQLite 数据库怎么处理？

选项 A：打包进应用（只读，每次启动从 Supabase 同步）  
选项 B：用户首次启动时下载（从 Supabase 导出）

推荐选项 B。

### Q5：是否需要代码签名？

| 平台 | 是否必须 | 说明 |
|------|---------|------|
| **macOS** | ✅ 必须 | 否则会被 Gatekeeper 拦截 |
| **Windows** | ⚠️ 推荐 | 否则会被 SmartScreen 警告 |
| **Linux** | ❌ 可选 | 大多数发行版不检查 |

---

## 后续规划

### Phase 1：MVP（1-2 天）

- [ ] 创建 Electron 主进程
- [ ] 配置 Supabase 连接
- [ ] 打包基础版本

### Phase 2：优化（3-5 天）

- [ ] 配置界面优化
- [ ] 文件上传路径处理
- [ ] 错误处理和提示

### Phase 3：发布（1-2 天）

- [ ] 跨平台测试
- [ ] 代码签名
- [ ] 文档和安装说明

---

## 参考资料

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [ASAR 格式规范](https://github.com/electron/asar)
- [PPA 架构文档](../architecture.md)

---

**最后更新**：2026-06-29  
**维护者**：bruce827
