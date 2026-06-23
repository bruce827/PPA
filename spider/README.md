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

#### 新增爬虫 URL / 脚本注意事项

新增站点时，爬虫侧要尽量输出系统可直接同步的标准字段。后端同步服务会做一定兼容，但不要只依赖中文字段或站点专属字段，否则容易出现“缺少 source_item_id 或 title，已跳过”的同步告警。

每条记录建议至少包含：

```json
{
  "source": "new_site_key",
  "source_id": "站点内稳定唯一ID",
  "title": "公告标题",
  "publish_time": "2026-05-05 10:00:00",
  "deadline_date": "2026-05-20",
  "tender_unit": "招标人/采购人",
  "detail_url": "原文详情页URL",
  "content_text": "正文纯文本",
  "attachments": []
}
```

字段约定：
- `source`：站点标识，要和输出文件名、调度服务中的 `site_key` 保持一致。
- `source_id`：站点内稳定唯一 ID，必填；可来自公告 ID、项目编号、详情页 ID 等。不要只靠标题去重。
- `title`：公告标题，必填；即使原站字段叫“标题”，也要额外映射成 `title`。
- `publish_time` / `published_date`：发布日期，优先用 `YYYY-MM-DD HH:mm:ss` 或 `YYYY-MM-DD`。
- `deadline_date` / `deadline_at`：投标截止日期或开标时间，能拿到就填。
- `tender_unit` / `issuer`：招标人、采购人或发布单位。
- `detail_url`：原文详情页链接，用于追溯和附件下载 Referer。
- `content_text`：详情正文纯文本，供后续字段解析、AI 分析和推送使用。
- `attachments` / `attachment_urls`：附件列表或附件 URL，按站点实际情况填写。

保存输出时使用 `spider_utils.save_json_only()`，不要生成 CSV，也不要创建时间戳子目录：

```python
json_file = spider_utils.save_json_only(
    records,
    site_key="new_site_key",
    output_dir="data",
    attachments_field="attachments",
    record_id_field="source_id",
    record_name_field="title",
    referer_field="detail_url",
)
```

新增脚本后还要：
1. 将脚本放到 `spider/site_xxx.py`。
2. 在 `spider_service.py` 的 `SPIDERS` 列表注册 `site_key`、脚本名和站点名称。
3. 在 `TRANSFORMATION.md` 的站点映射表补充 `site_key`、`record_id_field`、附件字段等。
4. 运行单个脚本确认生成 `data/YYYY-MM-DD_{site_key}.json`。
5. 再执行“同步本地数据”，确认没有新增同步告警。

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
