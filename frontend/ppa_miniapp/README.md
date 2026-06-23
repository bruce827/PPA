# PPA 招标快报小程序

这是基于微信原生小程序 + CloudBase 的首版业务验证工程。

## 当前范围

1. 微信登录
2. 当天招标列表
3. 日期范围筛选
4. 招标详情
5. 采纳 / 取消采纳
6. 会员入口与月会员下单发起
7. 支付后会员状态刷新与首次开通生效

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

需要预先创建七个集合：

1. `miniapp_users`
2. `tenders`
3. `miniapp_memberships`
4. `miniapp_membership_orders`
5. `miniapp_membership_ops_log`
6. `miniapp_membership_activity_logs`
7. `miniapp_tender_evaluations`

建议为 `tenders.source_item_id` 建唯一索引，避免后续推送写入重复数据。
建议为 `miniapp_memberships.openid` 建普通索引，方便后续会员状态查询。
建议为 `miniapp_membership_orders.out_trade_no` 建唯一索引，并为 `miniapp_membership_orders.openid` 建普通索引，方便后续订单查询与补单。
`miniapp_membership_ops_log` 首版可以为空，但建议提前创建，后续内部补单、修正与诊断会直接复用它。
`miniapp_membership_activity_logs` 用于记录会员查看完整详情的最小经营留痕；如果你暂时不建这个集合，核心门禁仍能工作，但 `Story 4.4` 的内容偏好统计会退化为空结果。
`miniapp_tender_evaluations` 用于把招标记录和后续 Web 端人工评估结果关联起来；如果你暂时不建这个集合，详情页中的人工评估区会退化为“暂无人工评估结果”。

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

### `miniapp_memberships`

- `openid`
- `plan_code`
- `status`
- `starts_at`
- `expires_at`
- `latest_order_no`
- `updated_at`

当前会员状态查询会按 `openid` 读取记录，并在云函数内按 `updated_at / expires_at / starts_at / created_at` 做兜底排序；
如果后续要提高查询性能，再额外补 `openid + updated_at` 相关索引即可，但首版联调不再依赖该索引才能正常工作。

### `miniapp_membership_orders`

- `out_trade_no`
- `openid`
- `plan_code`
- `order_type`
- `amount_fen`
- `currency`
- `status`
- `wx_prepay_id`
- `wx_transaction_id`
- `notify_received_at`
- `paid_at`
- `effective_from`
- `effective_until`
- `source_item_id`
- `membership_record_id`
- `membership_status_snapshot`
- `raw_notify_summary`
- `status_history`
- `created_at`
- `updated_at`

其中 `status_history` 用于保留订单关键状态变化的最小留痕，当前至少会记录：

- `created`
- `pay_pending` / `failed`
- `granted`

### `miniapp_membership_ops_log`

- `target_type`
- `target_id`
- `openid`
- `action`
- `reason`
- `operator`
- `created_at`

### `miniapp_membership_activity_logs`

- `openid`
- `source_item_id`
- `title`
- `issuer`
- `source_platform`
- `action`
- `membership_status_snapshot`
- `accessed_at`
- `created_at`

### `miniapp_tender_evaluations`

- `source_item_id`
- `evaluation_id`
- `evaluation_version`
- `title`
- `summary`
- `result_excerpt`
- `decision_label`
- `confidence_label`
- `analysis_summary`
- `strengths`
- `risks`
- `recommended_actions`
- `artifacts`
- `service_enabled`
- `service_title`
- `service_description`
- `service_url`
- `service_cta_text`
- `source_url`
- `artifact_count`
- `linked_by`
- `created_at`
- `updated_at`

当前 `Story 3.1` 新增了 `queryMembershipDiagnostics` 云函数，可按 `openid` 或 `out_trade_no` 查询当前会员状态、最近订单和最近一次人工修正记录。即使 `miniapp_membership_ops_log` 还没有任何数据，诊断查询也会正常返回空结果，不会阻塞联调。

当前 `Story 3.2` 新增了 `fixMembershipOrder` 云函数，用于内部人工补开、会员状态修正和订单状态修正。它要求调用方必须提供查询上下文（`queryType + queryOpenid/queryOutTradeNo`）和修正原因，所有动作都会写入 `miniapp_membership_ops_log`。

当前 `Story 3.3` 新增了隐藏内部页：

- `/pages/ops-membership-diagnostics/index`

它复用 `queryMembershipDiagnostics` 与 `fixMembershipOrder`，把“先查询 -> 再修正 -> 再回查确认”的最小异常处理闭环放进了小程序内，但仍然只适用于内部运营账号。

当前 `Story 4.4` 新增了会员经营分析云函数和隐藏内部页：

- `getMembershipInsights`
- `/pages/membership-insights/index`

它会汇总成功付费、续费、当前有效会员、完整详情访问次数，以及高关注项目/来源/招标单位等基础经营结果，帮助你在 MVP 阶段快速判断会员模式是否值得继续投入。

当前 `Story 5.1` 新增了人工评估关联云函数：

- `upsertTenderEvaluationLink`

它用于把某条 `source_item_id` 对应的招标记录和后续 Web 端人工评估结果建立关联。当前关联能力仍然只面向内部运营账号，未来再在 `Story 5.2` 中把完整人工评估内容消费页补齐。

当前 `Story 5.3` 继续复用 `miniapp_tender_evaluations`，支持在 `artifacts` 中写入 Excel 成果物列表。建议单个成果物至少包含：

- `artifact_id`
- `name`
- `file_type`
- `download_url`
- `updated_at`

详情页会只消费 Excel 类型成果物（`xlsx` / `xls` / `excel`），并为有效会员提供下载入口；如果没有成果物，会显示明确空态，但不影响人工评估正文和原详情内容。

当前 `Story 5.4` 继续复用 `miniapp_tender_evaluations` 作为 Web 导流配置来源。若要为某条项目开启“进一步服务”入口，可在同一条评估关联记录上补充：

- `service_enabled`
- `service_title`
- `service_description`
- `service_url`
- `service_cta_text`

详情页会在两种场景展示这组入口：

1. 非会员或已过期用户被拦截时，作为更高价值服务的补充说明
2. 有效会员查看完详情、人工评估或成果物后，继续转向 Web 端深度评估服务

当前小程序不会直接打开外部 Web 站点，而是把带项目上下文的服务链接复制到剪贴板，确保后续在浏览器或 Web 端继续跟进时不会丢失 `source_item_id / title / evaluation_id`。

如果要启用这两个内部云函数，还需要在对应函数环境里配置：

- `MEMBERSHIP_OPS_OPENIDS`

它是一个逗号分隔的内部运营 `openid` 白名单。未在白名单中的小程序用户，即使已登录，也不能调用内部诊断、人工修正和会员经营分析能力。
同一白名单也用于 `upsertTenderEvaluationLink`，避免普通用户自行伪造人工评估关联。

## 开发说明

1. 小程序代码只使用原生能力，避免引入额外构建依赖
2. 云函数返回统一结构：`{ success, data, error, errorCode }`
3. 采纳与取消采纳都必须走云函数，不允许前端直改数据库
4. 推送项目应调用 `upsertTenderBySourceId`，而不是直接改 `tenders` 集合
5. `upsertTenderBySourceId` 会按 `source_item_id` 幂等更新，并保留已有采纳状态
6. `queryMembershipDiagnostics` 与 `fixMembershipOrder` 仅供内部诊断和修正使用，不应直接暴露到普通小程序前台入口
7. `/pages/ops-membership-diagnostics/index` 是隐藏内部页，只应由命中 `MEMBERSHIP_OPS_OPENIDS` 白名单的账号使用

## 微信支付环境变量

如果要启用真实微信支付，需要在 `createMembershipOrder` 云函数环境里补齐以下变量：

- `WECHAT_PAY_APPID`
- `WECHAT_PAY_MCHID`
- `WECHAT_PAY_NOTIFY_URL`
- `WECHAT_PAY_PRIVATE_KEY`
- `WECHAT_PAY_SERIAL_NO`

当前 `Story 2.1` 已接好月会员下单与 `wx.requestPayment` 发起逻辑；如果这些环境变量缺失，系统会保留订单记录，但会明确提示“当前环境未完成微信支付配置”，不会伪造支付成功。

当前 `Story 2.2` 新增了 `refreshMembershipOrder` 云函数。真实支付成功后，前端会立即调用它确认订单状态并首次开通会员；如果你仍处于无商户测试阶段，也可以把订单手工改成 `paid` 后，再通过这个云函数把会员正式开通。

如果你当前还没有商户号，但要继续做内部验证，直接参考：

- [无商户手工测试方案](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/miniapp-bidding/membership-manual-testing-without-merchant.md)

如果你想先看当前版本有哪些明确接受延期、但暂时不改的风险项，直接参考：

- [会员 MVP 已知延期风险](/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/miniapp-bidding/membership-mvp-known-risks.md)

当前建议是：

1. **没有开通支付时**
   - 不配置 `WECHAT_PAY_*`
   - 继续走正常页面入口
   - 用“订单写入 -> 手工改成 `paid` -> 调 `refreshMembershipOrder`”完成闭环验证
2. **只有内部能力需要继续使用时**
   - 继续保留 `MEMBERSHIP_OPS_OPENIDS`
   - 白名单账号才能使用诊断、修正、经营分析和人工评估关联
3. **准备放大真实付费用户前**
   - 先回看上面的“已知延期风险”文档
   - 重点重审订单幂等、经营统计截断、评估关联覆盖更新和多套餐时长规则

如果你当前仍处于“还没有商户，但要继续试跑”的阶段，推荐直接按下面这条顺序测：

1. 先测登录、列表、详情拦截
2. 再测无会员 / 有效会员 / 已过期会员三态
3. 再测创建订单后，手工把订单改成 `paid`
4. 再调 `refreshMembershipOrder` 让会员正式生效
5. 最后测人工修正、经营分析、人工评估和 Web 导流

详细步骤和样例数据都已经整理在“无商户手工测试方案”里。

当前 `Story 4.1` 已把 `pages/membership-status/index` 扩展成双模式页面：

- 从详情页拦截入口进入时，继续作为“开通 / 续费”页使用
- 直接从列表页点击“会员状态”进入时，会调用 `getMembershipStatus` 展示当前会员状态、到期时间、续费入口和会员记录占位区

因此，如果你要做会员状态手测，现在可以直接从列表页点击“会员状态”进入，而不必手输页面路径。

当前 `Story 4.2` 已补一层轻量“站内提醒”：

- 会员状态页会对即将到期和已过期会员展示对应的到期/续费提醒
- 会员状态页提供“站内新招标提醒”开关，设置保存在本地缓存
- 列表页在开启提醒后会显示“新招标提醒已开启”提示卡，并保留“管理提醒”入口

这层能力当前只解决“回到小程序后落到正确页面或入口”的问题，不会发送真实微信订阅消息。后续如果接入微信订阅消息或服务端提醒，可直接复用这套页面入口与提醒文案结构。

当前 `Story 4.3` 已把会员套餐和转化文案改成“配置骨架”：

- `utils/payment.js` 现在内置月会员、季会员、年会员三档配置
- 首版仍只开放月会员；季卡和年卡只在页面上显示“敬请期待”
- `createMembershipOrder` 已改成按套餐目录校验，未来启用新套餐时不需要重写订单和支付主链路

因此，后续如果要开放多套餐，优先修改套餐配置和页面文案，不要另起一套支付或会员生效逻辑。

当前 `Story 4.4` 还补了一层最小经营分析能力：

- `getTenderDetail` 会在会员成功查看完整详情时，best-effort 写入 `miniapp_membership_activity_logs`
- `getMembershipInsights` 会按 `MEMBERSHIP_OPS_OPENIDS` 白名单返回会员经营概览
- `/pages/membership-insights/index` 是隐藏内部页，可从异常处理页跳转进入

这层能力不依赖真实商户，也不会影响支付和门禁主链路；即使活动日志集合暂时不可用，订单与会员基础统计也仍然可查。

当前 `Story 5.1` 已经在详情页中预留“人工评估”区域：

- 有效会员访问详情时，如果该项目已关联人工评估结果，会看到评估版本、成果物数量、评估摘要和判断摘要。
- 如果当前项目尚未关联人工评估结果，会看到“暂无人工评估结果”的占位提示。
- 非会员和已过期用户仍然不会看到这块内容，继续由原有会员门禁控制。

因此，后续你要做 5.1/5.2 联调时，最小步骤是：

1. 创建 `miniapp_tender_evaluations`
2. 部署 `upsertTenderEvaluationLink`
3. 用白名单账号调用 `upsertTenderEvaluationLink` 写一条测试关联
4. 重新打开对应项目详情，确认“人工评估”区出现关联结果

当前 `Story 5.2` 已把“人工评估”区扩成会员可读的正文结构：

- `decision_label`：评估结论，例如“建议跟进”
- `confidence_label`：判断信心，例如“高”
- `analysis_summary`：适合手机阅读的完整判断
- `strengths`：利好因素数组
- `risks`：主要风险数组
- `recommended_actions`：建议动作数组

这些字段都继续写在 `miniapp_tender_evaluations` 里，由 `upsertTenderEvaluationLink` 一并维护。有效会员打开详情时，无需跳转 Web，就可以直接看到结构化判断结果；非会员和已过期用户仍然拿不到这部分正文。

## 后续对接推送程序

本工程已经提供 `upsertTenderBySourceId` 云函数。后续推送程序建议通过该函数写入 `tenders` 集合，而不是直接写库，以避免覆盖已存在的采纳状态字段。
