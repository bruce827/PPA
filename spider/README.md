# spider 目录说明

这个目录用于放置已经爬好的招标数据文件。

## 目录结构

```text
spider/
├── README.md
└── data/
    ├── *.json
```

## 使用约定

1. 所有待同步文件都放在 `spider/data/`
2. 每个文件必须是合法 JSON
3. 支持以下三种结构：
   - 单条对象
   - 对象数组
   - `{ "items": [...] }`
4. 推荐字段直接对齐小程序 `upsertTenderBySourceId` 的 `data` 结构

## 最小字段

- `source_item_id`
- `title`
- `published_at`
- `deadline_at`
- `issuer`

## 建议字段

- `budget_amount`
- `region`
- `source_platform`
- `source_url`
- `summary`
- `announcement_html`
- `announcement_plain_text`
- `detail_payload`
- `last_pushed_at`

## 同步方式

PPA 后端会扫描 `spider/data/` 并把数据同步到本地 staging 表。

常用入口：

1. Umi 页面上的“同步本地数据”按钮
2. 命令行脚本：`node server/scripts/syncTenderFiles.js`
