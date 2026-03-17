# 会话纪要 - 2026-03-16

## 本次目标

围绕“本地 spider JSON -> PPA 后台 staging -> Umi 页面 -> 微信小程序”的演示链路，完成方案设计、代码落地和首轮联调。

## 已完成事项

### 1. 文档与方案

- 新增本地推送方案文档：
  - `docs/miniapp-bidding/local-spider-staging-push-plan.md`
- 明确采用的演示链路：
  - `spider/data/*.json`
  - `server` 同步到 SQLite staging
  - `Umi` 页面展示并触发推送
  - `server` 调 CloudBase 云函数写入小程序

### 2. 目录与配置

- 新增目录：
  - `spider/`
  - `spider/data/`
- 新增说明文档：
  - `spider/README.md`
- 新增 `server/.env`，用于服务端读取 CloudBase 推送配置
- 新增 `server/config/loadEnv.js`，启动时自动读取 `server/.env`

### 3. 后端能力

新增 staging 数据链路：

- `server/models/tenderStagingModel.js`
- `server/services/tenderStagingService.js`
- `server/services/tenderPushService.js`
- `server/controllers/tenderStagingController.js`

新增接口：

- `GET /api/opportunity/tender-staging`
- `POST /api/opportunity/tender-staging/sync`
- `POST /api/opportunity/tender-staging/:id/push`

新增脚本：

- `node server/scripts/syncTenderFiles.js`
- `node server/scripts/pushTenderStaging.js --id <stagingId>`

### 4. 前端页面

在 PPA 的“项目机会”菜单下新增页面：

- `frontend/ppa_frontend/src/pages/Opportunity/TenderPush.tsx`

页面能力：

- 展示 staging 数据
- 统计总数 / 待推送 / 已推送 / 失败
- 同步本地数据
- 单条推送 / 重试

## 本次使用的数据

本次联调使用了 3 个本地 JSON 文件：

- `spider/data/cnooc_tenders_20260316_174602.json`
- `spider/data/cnpc_tenders_20260316_172622.json`
- `spider/data/pipechina_tenders_20260316_174904.json`

同步结果：

- 原始记录总数：`220`
- 去重后 staging 总数：`120`

按来源文件分布：

- `cnooc_tenders_20260316_174602.json` -> `20`
- `cnpc_tenders_20260316_172622.json` -> `20`
- `pipechina_tenders_20260316_174904.json` -> `80`

## 已完成的推送

本次已成功推送 `3` 条 staging 记录到小程序 CloudBase：

1. staging `id=204`
   - `source_item_id=127650`
   - 标题：`浙江省网天然气站场环境现状调查与环境风险评估-非招标成交结果公告`
   - 说明：已推送成功，但该条 `published_date` 为空，不会出现在小程序默认按日期筛选的当天列表中

2. staging `id=124`
   - `source_item_id=2030830611005997058`
   - 标题：`云南中石油昆仑燃气有限公司昆明急修分公司土建承包项目`
   - 说明：已推送成功，发布日期为 `2026-03-09`

3. staging `id=101`
   - `source_item_id=37439acc-f613-4e98-94d7-c3c04ad4e6d9`
   - 标题：`中海油服-钻井事业部南海四号钻井绞车更新项目`
   - 说明：已推送成功，发布日期为 `2026-03-16`，适合直接作为当天演示数据

当前 staging 状态统计：

- `pending`: `117`
- `pushed`: `3`
- `failed`: `0`

## 联调结论

本次已经实际打通如下链路：

`spider 本地 JSON -> server staging -> Umi 页面 -> server 调 CloudBase -> 小程序`

其中：

- 本地同步已可重复执行
- 推送已可通过页面按钮或命令行脚本触发
- CloudBase 服务端 API Key 模式已接入
- 小程序端 `upsertTenderBySourceId` 已完成实际写入

## 已知问题

1. `pipechina` 数据中有大量记录缺少 `published_date`
   - 即使推送成功，也不会出现在小程序默认当天列表中
   - 演示时应优先推送 `CNOOC` / `CNPC` 中带日期的记录

2. 某些来源字段不统一
   - 已在 `tenderStagingService.js` 中做兼容
   - 但后续如果再接新 spider，仍建议尽量统一输出结构

3. `pipechina` 部分详情正文仍是 iframe 外壳 HTML
   - 当前可存储、可推送
   - 但对小程序详情展示的可读性一般

## 建议的下一步

1. 在 Umi 页面增加“只看可演示数据”筛选
   - 例如：只看 `published_date` 不为空，或只看当天数据

2. 增加“批量推送选中项”按钮
   - 方便演示时一次推多条

3. 对 `pipechina` spider 再做一轮清洗
   - 优先补 `published_date`
   - 次优先补更可读的公告正文

4. 如需长期使用，可补一张“推送日志表”
   - 记录每次推送的操作人、时间和结果

## 关键文件清单

- `docs/miniapp-bidding/local-spider-staging-push-plan.md`
- `docs/miniapp-bidding/session-summary-2026-03-16.md`
- `spider/README.md`
- `server/.env`
- `server/config/loadEnv.js`
- `server/models/tenderStagingModel.js`
- `server/services/tenderStagingService.js`
- `server/services/tenderPushService.js`
- `server/controllers/tenderStagingController.js`
- `server/scripts/syncTenderFiles.js`
- `server/scripts/pushTenderStaging.js`
- `frontend/ppa_frontend/src/pages/Opportunity/TenderPush.tsx`
