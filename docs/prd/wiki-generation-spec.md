# Wiki 生成模块规格文档

**模块名称**：Wiki 生成（Wiki Generation）
**版本**：1.0.0
**日期**：2026-06-06
**作者**：PPA Team

---

## 1. 概述

### 1.1 背景

团队积累了大量油田数字化项目的 Office 交付文档（Word/Excel），涵盖需求分析、概要设计、测试报告、实施方案等。这些文档目前分散在本地文件夹中，存在以下问题：

- **无法对外展示**：文档中包含客户名称（青海油田、国家电网等）、具体金额、地名等敏感信息，不能直接分享
- **缺乏结构化浏览**：50+ 项目的文档分散在多个文件夹中，无法快速检索和浏览
- **知识价值未释放**：高质量的项目交付物是稀缺资源，但目前仅在内部使用
- **无版本管理**：文档更新后无法追踪变更历史

### 1.2 目标

提供一套完整的 Wiki 生成工具链，支持：

1. **自动转换**：Word → Markdown 批量转换（Pandoc）
2. **智能脱敏**：AI 驱动的文档脱敏，保护商业敏感信息
3. **结构化输出**：生成带 Frontmatter 的 Markdown，可直接用于 VitePress 知识库
4. **人工审核**：脱敏报告 + 残留检测，确保信息安全

### 1.3 范围边界

| 范围 | 说明 |
|---|---|
| ✅ V1.9 包含 | 离线 Python 脚本（转换 + 脱敏 + Frontmatter + 目录整理）、PRD 文档 |
| ✅ V2.0 包含 | PPA 内集成的 Wiki 管理界面（上传、在线转换、预览、导出） |
| ❌ 不包含 | VitePress 搭建与部署、Dify RAG 问答、商业化（密码锁/发卡）、COS 文件管理 |

### 1.4 核心价值

| 价值 | 说明 |
|---|---|
| 知识沉淀 | 将分散的 Office 文档转化为结构化知识库 |
| 安全展示 | AI 智能脱敏，保护客户和商业信息 |
| 一键生成 | 50 个项目的文档全流程处理 < 30 分钟 |
| 可扩展 | 生成的 Markdown 可直接用于 VitePress、Dify RAG 等平台 |

---

## 2. 用户场景

### US-1：批量文档转换与脱敏

**角色**：系统管理员/知识库运营者

**场景**：
1. 将 50 个项目的 Word 文档按文件夹整理到 `scripts/wiki/input/` 目录
2. 运行 `01_word_to_markdown.py`，所有 Word 文档自动转换为 Markdown
3. 运行 `02_anonymize.py`，DeepSeek API 自动替换文档中的客户名、地名、金额
4. 审核 `_report.json`，抽查 5-10 个文档确认脱敏质量
5. 运行 `03_inject_frontmatter.py` 和 `04_organize_for_vitepress.py`
6. 将 `output/03_vitepress/` 复制到 VitePress 项目中

**验收标准**：
- 50 个项目全流程 < 30 分钟（不含人工审核）
- 脱敏后无客户名/地名/具体金额泄露
- 生成的 VitePress 目录可直接运行

### US-2：脱敏质量审核

**角色**：系统管理员

**场景**：
1. 查看 `_report.json` 中的处理统计（文件数、API 调用次数、token 用量）
2. 检查 `warnings` 字段中可能的残留敏感信息
3. 打开 5-10 个脱敏后的 .md 文件，搜索关键词确认无残留
4. 如发现遗漏，更新 `prompts/anonymize_system.txt` 后重新运行脱敏

**验收标准**：
- 人工抽检通过率 ≥ 95%
- 技术术语误替换率 ≤ 2%

### US-3（V2.0）：PPA 内在线管理

**角色**：系统管理员

**场景**：
1. 在 PPA 的 `/wiki` 页面上传 Word 文档
2. 在线触发转换和脱敏
3. 在线预览和编辑 Markdown 内容
4. 批量导出为 ZIP 包

---

## 3. 功能规格

### 3.1 Word → Markdown 转换

**技术方案**：调用 Pandoc CLI

| 特性 | 规格 |
|---|---|
| 输入格式 | `.docx`（Word 2007+） |
| 输出格式 | `markdown_github`（GitHub 风格 Markdown） |
| 表格处理 | 自动将 Word 表格转为 Markdown 表格 |
| 图片处理 | `--extract-media` 提取内嵌图片到独立目录 |
| 编码处理 | 自动检测 UTF-8/GBK/GB2312 |
| 批量处理 | 递归扫描输入目录，按子目录分组输出 |
| 临时文件 | 自动跳过 Word 临时文件（`~$` 前缀） |

**Pandoc 命令**：
```bash
pandoc input.docx -f docx -t markdown_github -o output.md --wrap=none --extract-media output/images
```

**输出目录结构**：
```
output/01_markdown/
├── 01_项目A/
│   ├── 需求文档.md
│   ├── 设计文档.md
│   └── images/
│       └── image1.png
└── 02_项目B/
    └── 测试报告.md
```

### 3.2 AI 智能脱敏

**技术方案**：调用 DeepSeek API（兼容 OpenAI 接口）

| 特性 | 规格 |
|---|---|
| AI 模型 | DeepSeek Chat（可配置替换） |
| 温度 | 0.1（低温度保证脱敏一致性） |
| 分段处理 | 按 `##` 二级标题拆分，逐段调用避免 token 溢出 |
| 失败回退 | API 调用失败时保留原文并标记 |
| 重试机制 | 3 次重试，递增间隔 |
| 残留检测 | 脱敏后自动扫描敏感词模式 |

**脱敏规则**：

| 类别 | 必须替换 | 示例 |
|------|---------|------|
| 企业名称 | 泛化称呼 | "青海油田" → "某大型油田企业" |
| 地名 | 省/市泛化 | "榆林市" → "某市" |
| 人名 | 职位替代 | "张三" → "某负责人" |
| 金额 | 数量级模糊 | "150万" → "百万元级" |
| 编号 | 占位符 | "XX-2024-001" → "某合同编号" |
| 联系方式 | 删除 | 手机号/邮箱/地址 → "[已脱敏]" |
| 日期 | 模糊化 | "2024-03-15" → "2024年" |

| 类别 | 必须保留 |
|------|---------|
| 技术术语 | SCADA、BIM、IoT、Three.js 等 |
| 功能模块名 | 储罐监控系统、数据采集模块等 |
| 行业术语 | 油田、气田、储罐、管道等 |
| Markdown 格式 | 标题、表格、列表等 |

**输出**：
```
output/02_anonymized/
├── 01_项目A/
│   ├── 需求文档.md
│   └── 设计文档.md
└── _report.json
```

**报告格式**（`_report.json`）：
```json
{
  "generated_at": "2026-06-06 10:30:00",
  "summary": {
    "total_files": 50,
    "api_calls": 120,
    "total_tokens": 45000,
    "duration_seconds": 300,
    "estimated_cost_yuan": 0.09
  },
  "files": [
    {
      "project": "01_项目A",
      "filename": "需求文档.md",
      "success": true,
      "api_calls": 3,
      "tokens": 1200,
      "warnings_count": 0
    }
  ]
}
```

### 3.3 Frontmatter 注入

**注入内容**：
```yaml
---
title: "需求规格说明书"
project_name: "01_数字化采油厂项目"
file_type: "需求文档"
download_link: "https://your-cos-bucket.cos.ap-region.myqcloud.com/01_数字化采油厂项目/"
tags:
  - "油田数字化"
  - "项目交付"
  - "需求文档"
date: "2026-06-06"
---
```

**文档类型自动检测**（基于文件名关键词）：

| 类型 | 关键词 |
|------|--------|
| 需求文档 | 需求、需求规格、用户需求、业务需求 |
| 设计文档 | 设计、概要设计、详细设计、架构设计、数据库设计 |
| 测试文档 | 测试、测试用例、测试报告、测试计划 |
| 实施文档 | 实施方案、部署方案、验收 |
| 用户手册 | 用户手册、操作手册、使用说明 |
| 项目管理 | 项目计划、进度报告、会议纪要、周报 |

**附加内容**：
```markdown
::: info 物理文件下载提示
本节内容对应的完整原始打包工程文件，您可以 **[👉 点击此处安全下载原件](链接)** 进行二次修改与参考。
:::
```

### 3.4 VitePress 目录组织

**功能**：
- 按项目文件夹组织，文件按文档生命周期排序（需求→设计→实施→测试→手册）
- 生成 `_sidebar.json` 侧边栏配置
- 生成每个项目的 `index.md` 概览页
- 生成全局首页 `index.md`

**输出结构**：
```
output/03_vitepress/
├── index.md                     # 全局首页
├── _sidebar.json                # 侧边栏配置
├── README.md                    # 使用说明
├── 01_项目A/
│   ├── index.md                 # 项目概览页
│   ├── 需求文档.md
│   ├── 设计文档.md
│   └── images/
└── 02_项目B/
    ├── index.md
    └── 测试报告.md
```

### 3.5（V2.0）PPA 内集成

**后端模块**（新增 `/api/wiki/` 路由）：

遵循 PPA 现有的 Routes → Controllers → Services → Models 分层架构。

- `services/wikiConvertService.js` — 调用 Pandoc 转换
- `services/wikiAnonymizeService.js` — 调用 AI 脱敏
- `services/wikiExportService.js` — 打包导出
- `models/wikiModel.js` — 数据库操作
- `controllers/wikiController.js` — HTTP 处理
- `routes/wiki.js` — 路由定义

**前端页面**（新增 `/wiki` 路由）：

- `/wiki/upload` — 文档上传（支持批量 .docx 拖拽上传）
- `/wiki/records` — 处理记录列表（ProTable）
- `/wiki/preview/:id` — Markdown 预览（支持编辑）
- `/wiki/report` — 脱敏报告查看

---

## 4. API 设计（V2.0）

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|------------|
| POST | `/api/wiki/upload` | 上传文档 | `multipart/form-data`（files + projectName） |
| POST | `/api/wiki/convert/:batchId` | 触发转换+脱敏 | — |
| GET | `/api/wiki/batches` | 获取批次列表 | `?status=&page=&size=` |
| GET | `/api/wiki/files/:batchId` | 获取批次下的文件列表 | — |
| GET | `/api/wiki/preview/:fileId` | 获取 Markdown 预览 | — |
| PUT | `/api/wiki/content/:fileId` | 编辑 Markdown 内容 | `{content: string}` |
| POST | `/api/wiki/export` | 导出 ZIP 包 | `{fileIds: []}` |
| GET | `/api/wiki/report/:batchId` | 获取脱敏报告 | — |

---

## 5. 数据库设计（V2.0）

### 5.1 表结构

#### `wiki_batches` — 批次记录

```sql
CREATE TABLE IF NOT EXISTS wiki_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'converting', 'converted', 'anonymizing', 'anonymized', 'reviewed', 'exported')),
    file_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `wiki_files` — 文件记录

```sql
CREATE TABLE IF NOT EXISTS wiki_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES wiki_batches(id),
    original_filename TEXT NOT NULL,
    project_folder TEXT NOT NULL,
    file_type TEXT DEFAULT '其他文档',
    markdown_content TEXT,
    anonymized_content TEXT,
    frontmatter_json TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'converting', 'converted', 'anonymizing', 'anonymized', 'reviewed', 'exported')),
    api_calls INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    warnings_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 迁移脚本

编号：`016_create_wiki_tables.js`

---

## 6. 脱敏质量标准

| 指标 | 标准 | 测量方式 |
|------|------|---------|
| 客户名残留率 | 0% | 人工搜索关键词 |
| 地名残留率 | ≤ 5%（通用描述性地名允许） | 人工抽检 |
| 金额残留率 | 0% | 正则匹配 + 人工抽检 |
| 技术术语保留率 | ≥ 98% | 人工对比原文 |
| 格式完整性 | 100%（表格/列表/标题不变） | 人工对比原文 |

---

## 7. 非功能需求

### 7.1 性能

| 指标 | 目标 |
|------|------|
| 单文档 Pandoc 转换 | < 10 秒 |
| 单文档 AI 脱敏 | < 30 秒 |
| 批量处理 50 个项目 | < 30 分钟（不含人工审核） |
| Frontmatter 注入 | < 1 秒/文件 |
| VitePress 目录整理 | < 5 秒 |

### 7.2 成本

| 项目 | 预估成本 |
|------|---------|
| DeepSeek API（50 个项目） | 约 ¥0.1-0.5 |
| Pandoc | 免费（开源） |
| Python 依赖 | 免费（开源） |
| VitePress 部署 | 免费（Vercel 个人版） |

### 7.3 可靠性

- 所有脚本幂等设计，重复运行覆盖输出
- API 调用失败不阻断批量流程，保留原文并标记
- 脱敏报告持久化，支持事后审核

---

## 8. 技术依赖

| 依赖 | 版本 | 用途 | 安装方式 |
|------|------|------|---------|
| Python | 3.8+ | 脚本运行环境 | 系统自带 |
| Pandoc | 2.0+ | Word → Markdown 转换 | `brew install pandoc` |
| requests | 2.28+ | DeepSeek API 调用 | `pip install requests` |
| pyyaml | 6.0+ | 配置文件解析 | `pip install pyyaml` |
| chardet | 5.0+ | 文件编码检测 | `pip install chardet` |
| DeepSeek API | — | AI 智能脱敏 | 需要 API Key |

---

## 9. 未来扩展

### 9.1 V2.0：PPA 内集成

- 在 PPA 中新增 `/wiki` 模块
- 支持在线上传、转换、预览、编辑
- 脱敏规则可视化管理
- 生成记录持久化到数据库

### 9.2 V2.1：VitePress 集成

- 生成的 Markdown 自动推送到 VitePress 项目 Git 仓库
- GitHub Actions 自动构建和部署

### 9.3 V2.2：Dify RAG 问答

- 脱敏后内容灌入 Dify 知识库
- VitePress 右下角嵌入 AI 对话气泡
- OpenAI text-embedding-3-small 向量化 + Cohere Rerank v3 重排

### 9.4 V2.3：商业化

- VitePress 密码锁插件
- 面包多/爱发卡自动发卡（299 元/份）
- COS 签名 URL（2 小时过期）
- 会员状态管理

---

## 附录 A：脚本文件清单

| 文件 | 说明 |
|------|------|
| `scripts/wiki/README.md` | 使用说明 |
| `scripts/wiki/requirements.txt` | Python 依赖 |
| `scripts/wiki/config.yaml` | 全局配置 |
| `scripts/wiki/01_word_to_markdown.py` | Word → Markdown 转换 |
| `scripts/wiki/02_anonymize.py` | AI 智能脱敏 |
| `scripts/wiki/03_inject_frontmatter.py` | Frontmatter 注入 |
| `scripts/wiki/04_organize_for_vitepress.py` | VitePress 目录整理 |
| `scripts/wiki/lib/pandoc_converter.py` | Pandoc 调用封装 |
| `scripts/wiki/lib/ai_anonymizer.py` | DeepSeek API 脱敏核心 |
| `scripts/wiki/lib/frontmatter_builder.py` | Frontmatter 生成器 |
| `scripts/wiki/lib/sensitive_detector.py` | 残留敏感词检测 |
| `scripts/wiki/lib/file_utils.py` | 文件工具函数 |
| `scripts/wiki/prompts/anonymize_system.txt` | 脱敏 System Prompt |

## 附录 B：与 Wiki Roadmap 的对应关系

| Roadmap 步骤 | V1.9 对应 | 状态 |
|---|---|---|
| 步骤一：数据结构化、脱敏与标签埋点 | 01-04 脚本 | ✅ 本版本完成 |
| 步骤二：VitePress 门户搭建 | 手动执行（脚本已生成目录） | ⏳ 用户自行完成 |
| 步骤三：Dify RAG 配置 | — | ❌ 不在范围 |
| 步骤四：安全分发与发卡 | — | ❌ 不在范围 |
