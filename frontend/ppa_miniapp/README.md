# PPA 招标快报小程序

这是基于微信原生小程序 + CloudBase 的首版业务验证工程。

## 当前范围

1. 微信登录
2. 当天招标列表
3. 日期范围筛选
4. 招标详情
5. 采纳 / 取消采纳

## 目录结构

```text
frontend/ppa_miniapp/
├── app.js
├── app.json
├── app.wxss
├── config/
├── data/
├── pages/
├── utils/
└── cloudfunctions/
```

## 启动前配置

1. 用微信开发者工具打开 `frontend/ppa_miniapp/`
2. 在 [config/env.js](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/frontend/ppa_miniapp/config/env.js) 中填入你的 CloudBase `envId`
3. 在 [project.config.json](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/frontend/ppa_miniapp/project.config.json) 中把 `appid` 改成你自己的小程序 AppID
4. 在微信开发者工具里为 `cloudfunctions/` 下每个云函数安装依赖

## CloudBase 集合

需要预先创建两个集合：

1. `miniapp_users`
2. `tenders`

建议为 `tenders.source_item_id` 建唯一索引，避免后续推送写入重复数据。

如果你要启用后续推送项目接入，还需要：

3. 在 CloudBase 中部署 `upsertTenderBySourceId` 云函数
4. 为该云函数配置环境变量 `PUSH_SECRET_KEY`

## 测试数据

仓库提供了示例数据：

- [sample-tenders.json](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/frontend/ppa_miniapp/data/sample-tenders.json)

可在 CloudBase 控制台导入到 `tenders` 集合。

当前样例数据抓取自中国海油招标公告列表第 1 页：

- `https://buy.cnooc.com.cn/cbjyweb/001/001001/1.html`

仓库还提供了可复用抓取脚本：

- [scrape_cnooc_sample_tenders.py](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/scripts/scrape_cnooc_sample_tenders.py)
- [sample-upsert-event.json](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/frontend/ppa_miniapp/data/sample-upsert-event.json)

如果开发者工具里的数据库导入被云存储卡住，可以直接部署并调用：

- `seedSampleTenders`

示例：

```bash
python3 scripts/scrape_cnooc_sample_tenders.py --count 4
```

`sample-upsert-event.json` 是后续推送项目可以参考的写入载荷格式。

导入数据库时，微信开发者工具里直接使用这个文件即可：

- [sample-tenders.json](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/frontend/ppa_miniapp/data/sample-tenders.json)

如果导入时报 `No available bucket`，直接跳过导入，改用 `seedSampleTenders` 云函数一键灌入样例数据。

## 字段约定

### `tenders`

- `source_item_id`
- `title`
- `published_at`
- `published_date`
- `deadline_at`
- `deadline_date`
- `issuer`
- `budget_amount`
- `region`
- `source_platform`
- `source_url`
- `summary`
- `announcement_html`
- `announcement_plain_text`
- `adopt_status`
- `adopted_by_openid`
- `adopted_by_name`
- `adopted_at`
- `last_pushed_at`
- `created_at`
- `updated_at`

### `miniapp_users`

- `openid`
- `display_name`
- `nickname`
- `avatar_url`
- `created_at`
- `last_login_at`

## 开发说明

1. 小程序代码只使用原生能力，避免引入额外构建依赖
2. 云函数返回统一结构：`{ success, data, error, errorCode }`
3. 采纳与取消采纳都必须走云函数，不允许前端直改数据库
4. 推送项目应调用 `upsertTenderBySourceId`，而不是直接改 `tenders` 集合
5. `upsertTenderBySourceId` 会按 `source_item_id` 幂等更新，并保留已有采纳状态

## 后续对接推送程序

本工程已经提供 `upsertTenderBySourceId` 云函数。后续推送程序建议通过该函数写入 `tenders` 集合，而不是直接写库，以避免覆盖已存在的采纳状态字段。
