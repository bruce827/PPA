# 本地 Spider 到小程序推送方案

## 目标

在不引入复杂采集链路和线上中间服务的前提下，完成一条适合演示的最小闭环：

1. `spider/` 目录保存已经爬好的本地 JSON 文件
2. `server/` 读取这些 JSON，并同步到本地 SQLite staging 表
3. `frontend/ppa_frontend/` 提供一个运营页面展示 staging 数据
4. 页面上点击“推送”后，由 `server/` 调用 CloudBase 云函数，把单条数据推入小程序数据库
5. 小程序侧立即可见这条招标数据

这条链路的重点不是自动化，而是“可演示、可控、可排障”。

## 为什么这样设计

当前项目的真实诉求是业务验证，不是建设正式的采集平台。为了让演示过程流畅，方案刻意做了三层收口：

1. 不让 Umi 直接读取本地文件
2. 不让推送项目直接写 CloudBase 数据库
3. 不让服务启动时自动扫目录

这样做有三个收益：

- 行为可控：什么时候同步、什么时候推送，都由页面按钮触发
- 状态可见：哪些数据已同步、已推送、推送失败，页面上能直接看到
- 排障简单：JSON 文件、本地 staging 表、CloudBase 三段链路可以分开排查

## 目录约定

新增目录：

```text
spider/
├── README.md
└── data/
    ├── *.json
```

约定：

- `spider/data/` 只放已经爬好的 JSON 文件
- 一个文件可以是单条对象、对象数组，或 `{ items: [...] }`
- 后端会在同步时做统一收敛

## 数据流

### 步骤 1：Spider 输出本地 JSON

Spider 项目只负责一件事：把已经抓好的招标数据写到 `spider/data/`。

推荐直接对齐小程序 `upsertTenderBySourceId` 的 `data` 结构，至少包含：

- `source_item_id`
- `title`
- `published_at`
- `deadline_at`
- `issuer`
- `budget_amount`
- `region`
- `source_platform`
- `source_url`
- `summary`
- `announcement_html`
- `announcement_plain_text`
- `detail_payload`
- `last_pushed_at`

最小示例：

```json
{
  "source_item_id": "1483109627478446081-zhy",
  "title": "海油发展-清洁能源公司珠海地区碳钢管热煨弯管加工服务专有协议",
  "published_at": "2026-03-16T00:00:00+08:00",
  "deadline_at": "2026-03-27T09:00:00+08:00",
  "issuer": "中海油能源发展股份有限公司",
  "budget_amount": null,
  "source_url": "https://buy.cnooc.com.cn/...",
  "announcement_html": "<h3>招标公告</h3><p>...</p>",
  "detail_payload": {
    "project_name": "海油发展-清洁能源公司珠海地区碳钢管热煨弯管加工服务专有协议"
  }
}
```

### 步骤 2：Server 同步本地 JSON 到 staging 表

Server 不直接把文件内容暴露给前端，而是把文件同步到本地 SQLite staging 表。

同步动作有两个入口，但底层共用同一个 service：

1. 页面按钮触发接口：`POST /api/opportunity/tender-staging/sync`
2. 命令行兜底脚本：`node server/scripts/syncTenderFiles.js`

同步动作的职责：

- 扫描 `spider/data/`
- 读取所有 JSON 文件
- 统一解析不同 JSON 结构
- 归一化为统一字段
- 按 `source_item_id` 去重
- 写入或更新 staging 表

### 步骤 3：Umi 页面展示 staging 数据

PPA 里新增一个“待推送招标”页面，展示本地 staging 数据，而不是直接扫文件。

页面功能只保留演示必需项：

- 顶部统计卡片：总数 / 未推送 / 已推送 / 失败
- “同步本地数据”按钮
- 列表分页
- 按状态筛选
- 查看基础字段
- 单条“推送”
- 失败后“重试”

### 步骤 4：Server 调 CloudBase 推送到小程序

点击“推送”后，不是由浏览器直接调用 CloudBase，而是由 `server/` 发起。

推荐路径：

`server -> CloudBase Node SDK -> callFunction(upsertTenderBySourceId)`

这样做的理由：

- CloudBase 鉴权信息只保留在服务端
- 推送结果可以写回 staging 表
- 页面可以直接展示“已推送 / 失败原因”

## staging 表设计

建议新增表：`opportunity_tender_staging`

字段建议：

- `id`
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
- `detail_payload_json`
- `source_file`
- `raw_payload_json`
- `push_status`
- `push_error`
- `last_synced_at`
- `pushed_at`
- `created_at`
- `updated_at`

### 状态定义

- `pending`：已同步到 staging，但还没推送
- `pushed`：已成功推送到小程序
- `failed`：推送失败，可重试

### 关键索引

- `source_item_id` 唯一索引
- `push_status` 普通索引
- `published_date` 普通索引

## Server 端模块设计

### model

新增：

- `server/models/tenderStagingModel.js`

职责：

- 建表与索引
- staging 数据 CRUD
- 按 `source_item_id` upsert
- 列表查询
- 状态更新

### service

新增：

- `server/services/tenderStagingService.js`
- `server/services/tenderPushService.js`

`tenderStagingService.js` 负责：

- 扫描目录
- 读取文件
- 解析 JSON
- 归一化字段
- 入库 staging

`tenderPushService.js` 负责：

- 读取 staging 记录
- 调 CloudBase 云函数 `upsertTenderBySourceId`
- 根据结果更新 `push_status`、`push_error`、`pushed_at`

### controller

新增：

- `server/controllers/tenderStagingController.js`

接口建议：

- `POST /api/opportunity/tender-staging/sync`
- `GET /api/opportunity/tender-staging`
- `POST /api/opportunity/tender-staging/:id/push`

## Umi 页面设计

页面建议放在：

- `frontend/ppa_frontend/src/pages/Opportunity/TenderPush.tsx`

并在现有“项目机会”菜单下新增入口。

页面布局建议：

1. 顶部四个统计卡片
2. 右侧一个主按钮：`同步本地数据`
3. 下方一个表格

表格字段建议：

- 项目名称
- 发布日期
- 截止日期
- 招标单位
- 来源文件
- 推送状态
- 错误信息
- 操作

操作列：

- `推送`
- `重试`
- `查看原文`

## CloudBase 对接方式

当前小程序侧已经有接收函数：

- `frontend/ppa_miniapp/cloudfunctions/upsertTenderBySourceId/index.js`

Server 端推送时，应传如下结构：

```json
{
  "secretKey": "PUSH_SECRET_KEY",
  "data": {
    "...": "staging 记录中的招标字段"
  }
}
```

服务端所需配置：

- `CLOUDBASE_ENV_ID`
- `CLOUDBASE_APIKEY`
- `CLOUDBASE_SECRET_ID`
- `CLOUDBASE_SECRET_KEY`
- `MINIAPP_PUSH_SECRET_KEY`
- `MINIAPP_PUSH_FUNCTION_NAME=upsertTenderBySourceId`

说明：

- `server/` 现在会自动读取 `server/.env`
- 推荐优先使用 `CLOUDBASE_APIKEY`
- 如果没有 `CLOUDBASE_APIKEY`，则继续使用 `CLOUDBASE_SECRET_ID + CLOUDBASE_SECRET_KEY`
- 除了页面上的“推送”按钮，还可以用命令行兜底：
  - `node server/scripts/pushTenderStaging.js --id 123`

## 演示时的建议流程

推荐演示链路：

1. 先展示 `spider/data/` 已经有 3 个 JSON 文件
2. 打开 Umi 页面，点击“同步本地数据”
3. 页面立刻出现 staging 列表
4. 选择一条数据点击“推送”
5. 该条状态变成“已推送”
6. 切到微信开发者工具或手机端小程序，刷新后看到该条数据

这样观众能直接看到：

`本地数据 -> PPA 后台页面 -> 小程序`

比“后台终端跑脚本 + 云后台手工执行函数”更顺。

## 为什么不做自动扫描

不建议 `server` 启动后自动扫描 `spider/data/`，原因如下：

- 重启服务就会触发副作用，行为不可控
- 演示时很难解释“为什么刚才没有、现在又有了”
- 多次扫描会把排查过程变复杂

最合理的方式是：

- 正常入口：页面按钮手动同步
- 兜底入口：命令行脚本手动同步

## 本期不做

- Spider 自动触发同步
- 批量推送到小程序
- 推送任务队列
- 推送审核流
- 多用户权限
- 文件上传界面

## 落地顺序

1. 建 `spider/` 目录和 README
2. 建 staging 表 model
3. 写本地 JSON 同步 service 和脚本
4. 暴露同步 / 列表 / 推送接口
5. 做 Umi 页面
6. 接 CloudBase 推送
7. 用 3 个 JSON 文件跑通演示
