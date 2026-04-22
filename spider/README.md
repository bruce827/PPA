# spider 招标信息爬虫项目

本目录包含招标信息爬虫的脚本、数据和调度服务。

## 目录结构

```
spider/
├── site_*.py              # 各平台爬虫脚本（已改造）
├── spider_utils.py        # 工具函数（save_json_only 等）
├── spider_service.py      # 统一调度服务
├── workflow.md            # 脚本改造工作流（新增站点时使用）
├── steps/                 # 改造工作流分步骤说明
│   ├── 0-precheck.md
│   ├── 1-copy.md
│   ├── 2-analyze.md
│   ├── 3-transform.md
│   ├── 4-update-service.md
│   └── 5-verify.md
├── TRANSFORMATION.md      # 改造规则文档（共性规则 + 意外情况记录）
├── SKILL.md               # 新建爬虫脚本生成指南（面向 AI 工具）
├── data/                  # JSON 数据输出目录
│   └── YYYY-MM-DD_*.json
├── report/                # 爬取简报目录
│   └── spider_report_*.md
└── decoded_pdfs/          # CMCC 附件 PDF 解码目录（在 data/ 下）
```

## 使用场景

### 场景 1: 日常运行爬虫

运行统一调度服务，抓取所有平台数据：

```bash
cd spider
python spider_service.py
```

执行后：
- 各平台数据保存到 `data/YYYY-MM-DD_{site_key}.json`
- 简报生成到 `report/spider_report_YYYY-MM-DD_HHMMSS.md`

### 场景 2: 运行单个爬虫

单独抓取某个平台（不影响其他平台）：

```bash
python spider/site_65.py          # 辽宁省政府采购网
python spider/site_86.py          # 国家电网
python spider/site_311.py         # 中国移动
# ... 其他 site_*.py 同理
```

### 场景 3: 新增爬虫脚本（改造工作流）

当 `server/uploads/bidding-site-scripts/` 中有新脚本时：

1. 阅读 `workflow.md`
2. 按顺序执行 `steps/0-precheck.md` → `steps/5-verify.md`
3. 每次遇到新问题，将意外情况追加到 `TRANSFORMATION.md` 的"意外情况记录"章节

### 场景 4: 新建爬虫脚本（面向 AI）

当需要为一个新网站编写爬虫时：

参考 `SKILL.md`，提供目标网站 URL，AI 可自动分析页面结构并生成可直接运行的脚本。

### 场景 5: 查看爬取结果

数据文件在 `data/` 目录，格式为 JSON：

```bash
ls spider/data/
cat spider/data/2026-04-22_sgcc.json | python -m json.tool | head -50
```

## 共性配置（TRANSFORMATION.md）

所有爬虫改造遵循统一规则：
- 输出路径：`data/YYYY-MM-DD_{site_key}.json`
- 无 CSV 文件
- 无时间戳子文件夹
- 由 `spider_service.py` 统一调度

详见 `TRANSFORMATION.md`。

## 依赖

```bash
pip install requests beautifulsoup4 lxml pypdf
# 部分脚本需要 playwright（site_313）
pip install playwright && playwright install chromium
```

## 站点列表

| site_key | 脚本 | 站点名称 |
|----------|------|----------|
| liaoning | site_65.py | 辽宁省政府采购网 |
| sgcc | site_86.py | 国家电网新一代电子商务平台 |
| chnenergy | site_87.py | 中国能源建设集团招标网 |
| cnpc | site_119.py | 中国石油招标投标网 |
| eavic | site_159.py | 中航工业电子采购平台 |
| sdi | site_181.py | 国投集团电子采购平台 |
| cnpc | site_307.py | 中国石油招标投标网（另一数据源） |
| pipechina | site_308.py | 国家管网电子招标平台 |
| cnooc | site_309.py | 中国海洋石油采办业务管理与交易系统 |
| cmcc | site_311.py | 中国移动采购与招标网 |
| snbid | site_312.py | 山东能源集团电子招标投标交易平台 |
| ykjtzb | site_313.py | 山东能源集团电子招标采购平台（旧站） |
