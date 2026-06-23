# 小程序会员支付一期功能规格

## 1. 功能定位

该模块是 PPA 招标快报小程序在“查看招标”基础上补上的第一阶段会员能力。

它的目标不是一次性做成完整会员平台，而是在现有小程序主链路上，先建立一个可验证的闭环：

1. 微信登录进入小程序
2. 浏览招标列表和基础公开信息
3. 在详情页识别会员状态并执行内容分层
4. 进入开通 / 续费入口
5. 创建会员订单并发起支付
6. 支付成功后刷新会员状态并生效
7. 支持内部诊断、人工修正和最小经营分析
8. 为后续人工评估、Excel 成果物和 Web 服务导流预留挂接能力

## 2. 一期范围

### 2.1 In Scope

1. 微信登录与用户档案初始化
2. 会员三态识别：`inactive / active / expired`
3. 列表页基础浏览与现有链路兼容
4. 详情页会员拦截与开通 / 续费入口
5. 月会员订单创建
6. 支付后会员状态刷新与首次开通
7. 有效期内续费与过期后重新开通
8. 订单状态留痕、到期失效与异常可核对
9. 会员状态页、站内提醒、套餐骨架
10. 最小经营分析能力
11. 人工评估结果、Excel 成果物和 Web 服务导流入口

### 2.2 Out of Scope

1. 完整后台会员管理系统
2. 自动续费
3. 自动退款
4. 复杂财务对账
5. 企业会员和多角色权限
6. 小程序内生产人工评估内容

## 3. 运行架构

一期会员能力运行在现有小程序技术栈上：

1. 小程序前端：微信原生小程序
2. 运行时后端：CloudBase 云函数
3. 运行时主数据：CloudBase 文档数据库
4. 管理与扩展平面：后续仍可挂接 `server/` 与 Web 后台

当前不把会员支付主闭环迁移到 `server/ + SQLite`，原因是：

1. 首版要复用已有小程序 `wx.cloud.callFunction` 模式
2. 首版优先验证业务成立性和低运维闭环
3. 后续人工评估和后台管理再逐步接到 PPA 主系统

## 4. 页面与用户流程

### 4.1 主要页面

1. `pages/login/index`
   - 登录与用户档案初始化
2. `pages/tender-list/index`
   - 招标列表、会员状态入口、提醒入口
3. `pages/tender-detail/index`
   - 详情门禁、完整详情、人工评估、成果物、Web 导流
4. `pages/membership-status/index`
   - 开通 / 续费页 + 会员状态页
5. `pages/ops-membership-diagnostics/index`
   - 隐藏内部页，查询与修正闭环
6. `pages/membership-insights/index`
   - 隐藏内部页，经营分析

### 4.2 一期核心流程

#### 流程 A：首次开通

1. 用户登录
2. 浏览列表，进入详情
3. 未开通用户被详情页拦截
4. 跳转会员状态页
5. 创建月会员订单
6. 发起支付
7. 支付成功后调用 `refreshMembershipOrder`
8. 会员状态变为 `active`
9. 返回详情继续查看完整内容

#### 流程 B：过期后续费

1. 已过期用户进入详情
2. 详情页展示续费拦截
3. 跳转会员状态页
4. 创建 `renew` 类型订单
5. 支付成功后刷新订单
6. 会员恢复为 `active`
7. 重新获得完整详情访问权限

#### 流程 C：异常处理

1. 内部白名单账号进入诊断页
2. 按 `openid` 或 `out_trade_no` 查询
3. 查看会员、订单、修正记录
4. 执行人工补开或修正
5. 自动回查确认

## 5. 核心业务状态

### 5.1 会员状态

| 状态 | 含义 | 用途 |
|------|------|------|
| `inactive` | 当前没有有效会员记录 | 详情页拦截并引导开通 |
| `active` | 当前会员有效 | 允许查看完整详情、人工评估、成果物 |
| `expired` | 有历史会员但已过期 | 详情页拦截并引导续费 |

### 5.2 订单状态

| 状态 | 含义 | 用途 |
|------|------|------|
| `created` | 订单已创建 | 最小状态留痕 |
| `pay_pending` | 已进入支付流程，待确认结果 | 支付中、未完成 |
| `paid` | 已确认支付成功 | 刷新会员前的中间状态 |
| `granted` | 已完成会员授予 | 可作为成功终态 |
| `failed` | 支付失败 | 用于失败反馈和排查 |
| `cancelled` | 用户取消或未继续支付 | 用于取消场景 |
| `manual_fixed` | 人工补开或人工修正后的成功记录 | 仅内部使用 |

### 5.3 访问状态

| 状态 | 含义 | 用途 |
|------|------|------|
| `full` | 可查看完整内容 | 有效会员正常访问 |
| `membership_required` | 当前需要开通会员 | 未开通详情拦截 |
| `membership_expired` | 当前需要续费 | 已过期详情拦截 |
| `pay_sync_pending` | 订单已成功但会员状态仍在同步 | 支付回流提示 |

## 6. 云函数与能力边界

### 6.1 面向普通用户的云函数

| 云函数 | 作用 |
|--------|------|
| `loginUser` | 登录并创建/复用用户档案 |
| `getTenderList` | 返回列表页公开字段 |
| `getTenderDetail` | 返回详情页内容并执行会员门禁 |
| `getMembershipStatus` | 返回当前会员状态和到期信息 |
| `createMembershipOrder` | 创建订单并尝试发起支付 |
| `refreshMembershipOrder` | 支付后刷新订单与会员状态 |
| `adoptTender` | 采纳项目 |
| `cancelTenderAdoption` | 取消采纳 |

### 6.2 仅面向内部白名单的云函数

| 云函数 | 作用 |
|--------|------|
| `queryMembershipDiagnostics` | 查询会员、订单和修正记录 |
| `fixMembershipOrder` | 人工补开、状态修正、订单修正 |
| `getMembershipInsights` | 会员经营分析 |
| `upsertTenderEvaluationLink` | 写入人工评估、成果物和 Web 导流关联 |

### 6.3 CloudBase 运行时约束

1. `openid` 来自 CloudBase 运行时上下文，不接受前端自报
2. 内部白名单能力依赖环境变量 `MEMBERSHIP_OPS_OPENIDS`
3. 真实微信支付依赖 `WECHAT_PAY_*` 环境变量

## 7. CloudBase 数据结构

本节是一期最重要的设计补充：会员支付能力的数据主真相在 CloudBase，而不是 `server/ppa.db`。

### 7.1 `tenders`

用途：

1. 招标主数据
2. 列表页与详情页的内容源
3. 会员门禁围绕它做内容分层
4. 后续人工评估与成果物通过 `source_item_id` 与它关联

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `source_item_id` | string | 招标业务唯一标识 | 去重、详情查询、评估关联主键 |
| `title` | string | 项目标题 | 列表与详情展示 |
| `published_at` | string | 发布时间 ISO 时间 | 列表排序与详情展示 |
| `published_date` | string | 发布日期文本 | 日期筛选与展示兜底 |
| `deadline_at` | string | 截止时间 ISO 时间 | 列表展示与临近截止判断 |
| `deadline_date` | string | 截止日期文本 | 日期展示兜底 |
| `issuer` | string | 招标单位 | 列表与详情展示 |
| `budget_amount` | string | 预算金额 | 列表与详情展示 |
| `region` | string | 地区 | 详情展示 |
| `source_platform` | string | 来源平台 | 详情展示、经营分析维度 |
| `source_url` | string | 原文链接 | 仅对有权限用户展示 |
| `summary` | string | 项目摘要 | 列表/详情基础判断信息 |
| `announcement_html` | string | 原始公告 HTML | 有权限用户详情正文 |
| `announcement_plain_text` | string | 公告纯文本 | 降级展示、搜索/提取辅助 |
| `detail_payload` | object | 站点原始详情扩展结构 | 有权限详情与后续扩展 |
| `adopt_status` | string | 当前采纳状态 | 列表和详情状态显示 |
| `adopted_by_openid` | string | 采纳人 openid | 权限校验与状态留痕 |
| `adopted_by_name` | string | 采纳人展示名 | 列表和详情展示 |
| `adopted_at` | string | 采纳时间 | 详情展示 |
| `last_pushed_at` | string | 推送到小程序时间 | 推送链路追踪 |
| `created_at` | string | 写入创建时间 | 审计与排序 |
| `updated_at` | string | 最后更新时间 | 内容变更追踪 |

### 7.2 `miniapp_users`

用途：

1. 小程序用户主档案
2. 以 `openid` 作为稳定身份主键
3. 不承载会员和支付主状态

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `openid` | string | 微信用户唯一身份标识 | 用户主键，关联会员与订单 |
| `display_name` | string | 用户自定义展示名 | 页面展示、采纳展示 |
| `nickname` | string | 微信昵称 | 首次初始化和兜底展示 |
| `avatar_url` | string | 微信头像地址 | 页面展示预留 |
| `created_at` | string | 首次创建时间 | 审计 |
| `last_login_at` | string | 最近登录时间 | 活跃度与排查 |

### 7.3 `miniapp_memberships`

用途：

1. 当前会员状态主记录
2. 详情门禁最终判定依据之一
3. 用于续费、到期和会员状态页展示

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `openid` | string | 所属用户 openid | 与用户、订单关联 |
| `plan_code` | string | 当前生效套餐编码 | 区分月卡/后续季卡/年卡 |
| `status` | string | 当前会员状态 | `inactive / active / expired` 判定 |
| `starts_at` | string | 本轮会员开始时间 | 用于时长计算与展示 |
| `expires_at` | string | 本轮会员到期时间 | 到期判断与续费提示 |
| `latest_order_no` | string | 最近一次影响会员状态的订单号 | 排查、回查与续费链路追踪 |
| `updated_at` | string | 最后更新时间 | 排序和状态读取 |

### 7.4 `miniapp_membership_orders`

用途：

1. 会员订单总账
2. 支付、刷新、补单、留痕的主记录
3. 后续经营分析和异常排查的核心数据源

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `out_trade_no` | string | 商户侧订单号 | 订单唯一业务键 |
| `openid` | string | 下单用户 openid | 用户与订单关联 |
| `plan_code` | string | 套餐编码 | 判断购买的会员类型 |
| `order_type` | string | 订单类型 | `open / renew` 区分首开与续费 |
| `amount_fen` | number | 支付金额，单位分 | 金额计算与对账 |
| `currency` | string | 币种 | 当前固定 `CNY` |
| `status` | string | 当前订单状态 | 支付/授予流程主状态 |
| `wx_prepay_id` | string | 微信预支付单号 | 支付发起追踪 |
| `wx_transaction_id` | string | 微信支付交易单号 | 查单与支付成功关联 |
| `notify_received_at` | string / null | 接收到支付通知的时间 | 回调链路追踪 |
| `paid_at` | string / null | 支付成功时间 | 会员生效时间基准 |
| `effective_from` | string / null | 本订单对应权益开始时间 | 权益追踪 |
| `effective_until` | string / null | 本订单对应权益结束时间 | 权益追踪 |
| `source_item_id` | string / null | 触发购买的项目业务键 | 关联具体项目上下文 |
| `membership_record_id` | string / null | 关联的会员记录 ID | 订单与会员主记录映射 |
| `membership_status_snapshot` | string | 下单或处理时的会员状态快照 | 排查场景辅助 |
| `raw_notify_summary` | string | 回调或手工模拟摘要 | 排查与留痕 |
| `status_history` | array | 状态变化历史 | 保留 `created / pay_pending / paid / granted` 等轨迹 |
| `created_at` | string | 订单创建时间 | 审计与排序 |
| `updated_at` | string | 最后更新时间 | 排序与状态刷新 |

### 7.5 `miniapp_membership_ops_log`

用途：

1. 内部人工补开和修正审计
2. 异常处理闭环留痕

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `target_type` | string | 被操作对象类型 | 如 `membership`、`order` |
| `target_id` | string | 被操作对象标识 | 用于回查具体记录 |
| `openid` | string | 目标用户 openid | 排查与用户关联 |
| `action` | string | 操作类型 | 如人工补开、人工修正 |
| `reason` | string | 修正原因 | 审计与排查 |
| `operator` | string | 执行人标识 | 记录谁做的操作 |
| `created_at` | string | 操作时间 | 排序和审计 |

### 7.6 `miniapp_membership_activity_logs`

用途：

1. 记录有效会员查看完整详情的最小经营行为
2. 为经营分析提供基础数据

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `openid` | string | 查看用户 openid | 会员访问追踪 |
| `source_item_id` | string | 所查看项目的业务键 | 项目关注度统计 |
| `title` | string | 项目标题快照 | 经营分析展示 |
| `issuer` | string | 招标单位快照 | 经营分析展示 |
| `source_platform` | string | 来源平台快照 | 平台维度统计 |
| `action` | string | 当前行为类型 | 当前为查看完整详情 |
| `membership_status_snapshot` | string | 当时会员状态快照 | 数据校验 |
| `accessed_at` | string | 用户访问时间 | 活跃度与趋势分析 |
| `created_at` | string | 写入时间 | 审计 |

### 7.7 `miniapp_tender_evaluations`

用途：

1. 将招标主数据与人工评估结果关联
2. 为有效会员展示评估正文
3. 存放 Excel 成果物下载信息
4. 存放 Web 服务导流配置

| 字段 | 类型 | 含义 | 用途 |
|------|------|------|------|
| `source_item_id` | string | 对应招标项目业务键 | 与 `tenders` 建立稳定关联 |
| `evaluation_id` | string | 评估结果标识 | 评估记录主键 |
| `evaluation_version` | string | 评估版本号 | 区分后续版本演进 |
| `title` | string | 评估标题 | 详情页展示 |
| `summary` | string | 评估摘要 | 高层说明 |
| `result_excerpt` | string | 判断摘要摘录 | 快速预览 |
| `decision_label` | string | 评估结论标签 | 如“建议跟进” |
| `confidence_label` | string | 判断信心标签 | 如“高 / 中 / 低” |
| `analysis_summary` | string | 完整判断正文 | 会员详情正文 |
| `strengths` | array | 利好因素数组 | 结构化评估展示 |
| `risks` | array | 风险因素数组 | 结构化评估展示 |
| `recommended_actions` | array | 建议动作数组 | 结构化评估展示 |
| `artifacts` | array | 成果物列表 | Excel 下载入口来源 |
| `service_enabled` | boolean | 是否启用进一步服务导流 | 控制 Web 服务入口显示 |
| `service_title` | string | 导流标题 | 详情页展示 |
| `service_description` | string | 导流说明 | 详情页展示 |
| `service_url` | string | Web 服务基础链接 | 复制带项目上下文的服务入口 |
| `service_cta_text` | string | 导流按钮文案 | 详情页展示 |
| `source_url` | string | 评估来源链接 | 后续管理追踪 |
| `artifact_count` | number | 成果物数量 | 快速展示与校验 |
| `linked_by` | string | 关联操作人 | 审计与排查 |
| `created_at` | string | 首次关联时间 | 审计 |
| `updated_at` | string | 最后更新时间 | 版本与同步追踪 |

## 8. 数据结构设计原则

### 8.1 为什么不把会员字段塞进 `miniapp_users`

原因：

1. 用户档案是用户档案
2. 会员状态是会员状态
3. 订单台账是订单台账

三者生命周期不同，如果混在一张表里：

1. 难以审计支付和补单轨迹
2. 难以支持续费、到期、异常处理
3. 难以扩展到多套餐和人工评估权益

### 8.2 为什么订单和会员要分层

1. 订单记录的是“支付和授予权益的过程”
2. 会员记录的是“当前访问控制结果”

这样可以做到：

1. 详情门禁只看当前有效状态
2. 异常排查仍能回溯完整订单历史

### 8.3 为什么评估结果单独建集合

1. 人工评估是高价值增强能力，不应混进 `tenders`
2. `tenders` 仍保持招标主数据职责
3. 后续补成果物、Web 导流或版本迭代时，不需要改动招标主记录结构

## 9. 索引建议

一期建议至少准备这些索引：

1. `tenders.source_item_id` 唯一索引
2. `miniapp_memberships.openid` 普通索引
3. `miniapp_membership_orders.out_trade_no` 唯一索引
4. `miniapp_membership_orders.openid` 普通索引
5. `miniapp_tender_evaluations.source_item_id` 普通索引

## 10. 当前环境变量

### 10.1 真实支付相关

如果要启用真实微信支付，需要在 CloudBase 对应云函数中配置：

1. `WECHAT_PAY_APPID`
2. `WECHAT_PAY_MCHID`
3. `WECHAT_PAY_NOTIFY_URL`
4. `WECHAT_PAY_PRIVATE_KEY`
5. `WECHAT_PAY_SERIAL_NO`

### 10.2 内部运营相关

如果要启用内部诊断、修正、经营分析和人工评估关联，需要配置：

1. `MEMBERSHIP_OPS_OPENIDS`

## 11. 当前验收口径

一期验收以以下标准为准：

1. 同一 `openid` 的用户档案可正确创建与复用
2. 未开通、有效、已过期三态能稳定识别
3. 非会员不能获取完整详情、人工评估和成果物
4. 创建订单后可进入支付发起流程
5. 支付后可通过刷新订单完成首次开通或续费
6. 订单、会员和人工修正都有最小留痕
7. 有效会员可查看人工评估结果、成果物和进一步服务入口

## 12. 相关文档

1. `docs/miniapp-bidding/prd.md`
2. `docs/miniapp-bidding/tech-spec.md`
3. `docs/prd/project-overview.md`
4. `_bmad-output/planning-artifacts/prd.md`
5. `_bmad-output/planning-artifacts/architecture.md`
