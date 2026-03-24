# 项目机会-待推送招标功能规格

## 1. 功能定位

“待推送招标”是 PPA 在“项目机会”域中的一个运营功能，用于把本地 Spider 产出的招标公告 JSON 收敛到本地 staging 表，再由运营人员按条推送到微信小程序。

该功能的目标不是建设完整采集平台，而是提供一条可控、可排障、可演示的数据闭环：

1. 本地 Spider 负责产出 JSON 文件
2. PPA 后端把 JSON 同步到 `opportunity_tender_staging`
3. PPA 前端展示 staging 列表并允许人工触发同步
4. 运营人员按条推送到小程序

## 2. 当前数据源约定

### 2.1 真源目录

- 同步入口固定读取 `spider/data`
- 仅扫描目录顶层的 `.json` 文件
- 不递归扫描子目录

这意味着：

- 根目录中的 JSON 会参与“同步本地数据”
- 备份目录中的 JSON 不会被同步

### 2.2 当前推荐输入

当前推荐把聚合文件作为唯一真源，放在：

- `spider/data/all_notices_with_ai_20260324_155539.json`

旧站点级 JSON 可移动到备份目录，但不应继续留在 `spider/data` 根目录，否则会和聚合文件一起参与同步。

## 3. 页面与接口

### 3.1 页面入口

- 页面：`/opportunity/tender-push`
- 页面名称：待推送招标
- 主按钮：`同步本地数据`

### 3.2 后端接口

- `GET /api/opportunity/tender-staging`
- `POST /api/opportunity/tender-staging/sync`
- `POST /api/opportunity/tender-staging/:id/push`

## 4. 同步本地数据规则

### 4.1 支持的 JSON 结构

同步逻辑支持以下输入结构：

1. 数组 `[...]`
2. 对象包裹 `{"items": [...]}`
3. 对象包裹 `{"data": [...]}`
4. 对象包裹 `{"records": [...]}`
5. 单对象 `{...}`

### 4.2 字段归一化

同步时会把不同来源的字段统一归一化到 staging 字段，包括：

- `source_item_id`
- `title`
- `published_at` / `published_date`
- `deadline_at` / `deadline_date`
- `issuer`
- `budget_amount`
- `region`
- `source_platform`
- `source_url`
- `summary`
- `announcement_html`
- `announcement_plain_text`
- `detail_payload_json`
- `raw_payload_json`

对于聚合文件中的记录，如果存在 `raw_payload_json`，系统会优先从其中回填原始站点字段。

### 4.3 主键归一化规则

`source_item_id` 是 staging 表与小程序推送的业务唯一键。

当前规则如下：

1. 如果记录显式提供 `source_item_id` 或 `sourceItemId`，直接使用
2. 旧站点直采记录：
   - `cnooc` 优先使用 `rowGuid`
   - `cnpc` 优先使用 `goodsId`
   - `pipechina` 优先使用站点记录里的 `id`，其次 `businessId`
3. 聚合文件记录：
   - `cnpc` / `cnooc` / `pipechina` 优先使用 `source + source_id` 对应的原站点业务键，以便和历史直采记录对齐
   - 其他来源统一生成作用域主键：`${source}:${source_id}`
4. 如果来源不支持 `source_id` 对齐，再退回到带作用域的 `id` 或 `businessId`

### 4.4 去重与优先级

同一次同步过程中，系统先以内存 `Map` 按 `source_item_id` 去重。

当多个文件中出现同一业务键时，保留“较新”的那条记录。比较顺序参考：

1. `last_pushed_at`
2. `published_at`
3. `deadline_at`
4. 源文件修改时间

### 4.5 全量收敛行为

`spider/data` 被视为当前真源。

每次同步完成后，系统会执行三类处理：

1. 新记录插入 staging
2. 已存在且 payload 变化的记录更新 staging
3. 当前目录中已经不存在的旧记录，从 staging 中清理

因此，“同步本地数据”不是简单追加，而是一次按当前目录状态进行的全量收敛。

### 4.6 状态回写规则

如果某条记录本次同步后 payload 未变化：

- 保留原 `push_status`
- 保留原 `push_error`
- 保留原 `pushed_at`

如果 payload 发生变化：

- `push_status` 重置为 `pending`
- `push_error` 清空
- `pushed_at` 清空

## 5. 同步结果反馈

前端成功提示应包含以下汇总字段：

- `fileCount`
- `deduplicatedCount`
- `created`
- `updated`
- `pruned`
- `errors.length`

其中：

- `deduplicatedCount` 表示当前目录参与同步后保留下来的有效业务记录数
- `pruned` 表示因为当前目录中已不存在而被清理的 staging 记录数

## 6. staging 表

表名：

- `opportunity_tender_staging`

核心字段：

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

索引要求：

- `source_item_id` 唯一索引
- `push_status` 普通索引
- `published_date` 普通索引
- `source_file` 普通索引

## 7. 推送到小程序

单条推送继续沿用服务端调用 CloudBase 云函数的方式。

推送链路：

1. 前端点击“推送”
2. 后端读取对应 staging 记录
3. 构造小程序写入 payload
4. 调用 `upsertTenderBySourceId`
5. 根据结果回写 staging 状态

推送成功后：

- `push_status = pushed`
- `push_error = null`
- `pushed_at = 当前时间`

推送失败后：

- `push_status = failed`
- `push_error = 失败原因`

## 8. 运维建议

### 8.1 推荐使用方式

1. 仅保留聚合文件在 `spider/data` 根目录
2. 旧 JSON 移入备份目录
3. 每次点击“同步本地数据”后，以当前目录为准更新 staging

### 8.2 不建议的方式

以下做法会导致 staging 结果混入多份来源：

1. 同时保留聚合文件和旧站点级 JSON 在根目录
2. 将备份文件重新放回 `spider/data` 根目录
3. 误把 staging 当成历史仓库而不是当前真源快照

## 9. 验收口径

本模块验收以以下标准为准：

1. 聚合文件可以独立完成同步
2. `cnpc` / `cnooc` / `pipechina` 的聚合记录能与历史主键正确对齐
3. 非上述来源的聚合记录会生成带来源作用域的稳定主键
4. 从根目录删除旧 JSON 后，再次同步会自动清理 staging 中对应旧记录
5. 页面同步提示可准确显示新增、更新、清理数量
6. 推送到小程序的链路不受同步规则调整影响
