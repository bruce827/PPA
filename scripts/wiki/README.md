# Wiki 数据准备脚本

将油田数字化项目的 Office 文档（Word/Excel）转化为 VitePress 可用的 Markdown 知识库内容。

## 流程概览

```
Word/Excel 文档 → Pandoc 转换 → Markdown → AI 脱敏 → Frontmatter 注入 → VitePress 目录
```

## 环境准备

### 1. 安装 Pandoc

```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# 验证安装
pandoc --version
```

### 2. 安装 Python 依赖

```bash
cd scripts/wiki
pip install -r requirements.txt
```

### 3. 配置

编辑 `config.yaml`：
- 填入 DeepSeek API Key（`anonymize.api_key`）
- 根据需要调整 `download_base_url`（COS 下载链接前缀）

## 使用步骤

### Step 0: 准备输入文件

将 Word 文档按项目放入 `input/` 目录：

```
input/
├── 01_数字化采油厂项目/
│   ├── 需求规格说明书.docx
│   ├── 概要设计文档.docx
│   └── 测试报告.docx
├── 02_SCADA监控平台/
│   ├── 用户需求文档.docx
│   └── 详细设计文档.docx
└── ...
```

### Step 1: Word → Markdown

```bash
python 01_word_to_markdown.py
```

- 输出：`output/01_markdown/{projectName}/{filename}.md`
- 提取内嵌图片到 `output/01_markdown/{projectName}/images/`

### Step 2: AI 脱敏

```bash
python 02_anonymize.py
```

- 输出：`output/02_anonymized/{projectName}/{filename}.md`
- 脱敏报告：`output/02_anonymized/_report.json`
- **注意**：此步骤调用 DeepSeek API，会产生少量费用

### Step 3: 人工审核

**关键步骤，不可跳过。**

1. 查看 `_report.json` 确认处理统计
2. 打开 5-10 个脱敏后的 `.md` 文件
3. 搜索以下关键词确认无残留：
   - 客户名：`青海油田`、`国家电网`、`国家电投`、`中石油`、`中石化`、`中海油`
   - 地名：`陕西`、`甘肃`、`青海`、`新疆`、`榆林`、`大庆`
   - 数字：检查是否有具体金额泄露
4. 如发现遗漏，更新 `prompts/anonymize_system.txt` 后重新运行 Step 2

### Step 4: 注入 Frontmatter

```bash
python 03_inject_frontmatter.py
```

- 在每个 `.md` 文件头部注入 YAML Frontmatter
- 自动检测文件类型（需求/设计/测试/实施/用户手册）

### Step 5: 整理 VitePress 目录

```bash
python 04_organize_for_vitepress.py
```

- 输出：`output/03_vitepress/` — 可直接用于 VitePress 项目
- 生成 `_sidebar.json` 侧边栏配置
- 生成项目 `index.md` 概览页和全局首页

## 目录结构

```
scripts/wiki/
├── README.md                        # 本文件
├── requirements.txt                 # Python 依赖
├── config.yaml                      # 全局配置
├── 01_word_to_markdown.py           # Word → Markdown 转换
├── 02_anonymize.py                  # AI 智能脱敏
├── 03_inject_frontmatter.py         # Frontmatter 注入
├── 04_organize_for_vitepress.py     # VitePress 目录整理
├── lib/
│   ├── pandoc_converter.py          # Pandoc 调用封装
│   ├── ai_anonymizer.py             # DeepSeek API 脱敏核心
│   ├── frontmatter_builder.py       # Frontmatter 生成器
│   ├── sensitive_detector.py        # 残留敏感词检测
│   └── file_utils.py               # 文件工具函数
├── prompts/
│   └── anonymize_system.txt         # 脱敏 System Prompt
├── input/                           # [放置] 原始 Word 文档
└── output/                          # [生成] 处理结果
    ├── 01_markdown/                 # Pandoc 转换结果
    ├── 02_anonymized/               # 脱敏后文档
    └── 03_vitepress/                # VitePress 就绪目录
```

## 配置说明

详见 `config.yaml` 中的注释。主要配置项：

| 配置项 | 说明 |
|--------|------|
| `anonymize.api_key` | DeepSeek API Key（必填） |
| `anonymize.model` | AI 模型名（默认 `deepseek-chat`） |
| `anonymize.temperature` | 脱敏温度（默认 0.1，低温度保证一致性） |
| `frontmatter.download_base_url` | COS 下载链接前缀 |
| `vitepress.title` | Wiki 站点标题 |

## 注意事项

- 所有脚本均为幂等设计，重复运行会覆盖输出
- `output/` 目录已在 `.gitignore` 中排除（如果不存在请手动添加）
- AI 脱敏的 System Prompt 可根据实际效果迭代优化
