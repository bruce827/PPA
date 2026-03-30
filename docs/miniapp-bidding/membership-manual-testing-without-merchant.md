# 小程序会员功能无商户手工测试方案

## 适用场景

这份文档用于你还**没有微信支付商户号**、但要继续推进小程序会员功能开发和内部验证的阶段。

当前结论：

1. 可以继续开发，不需要暂停到个体工商户和微信支付都办完
2. 当前阶段可以不配置 `WECHAT_PAY_*` 环境变量
3. 但如果不配置这些环境变量：
   - `createMembershipOrder` 仍会创建订单记录
   - 页面会明确提示“当前环境未完成微信支付配置”
   - 不会真的拉起可用支付
   - 但你仍然可以手工把订单改成 `paid`，再通过 `refreshMembershipOrder` 正式开通会员

因此，当前内部验证应采用：

- `miniapp_membership_orders` 手工造订单
- `miniapp_memberships` 手工改会员状态

而不是为了测试方便去增加“假支付成功”的前台逻辑。

## 当前最小前置条件

即使你没有开通支付，下面这些仍然建议准备好：

1. CloudBase 已创建集合：
   - `miniapp_users`
   - `tenders`
   - `miniapp_memberships`
   - `miniapp_membership_orders`
   - `miniapp_membership_ops_log`
   - `miniapp_membership_activity_logs`
   - `miniapp_tender_evaluations`
2. 需要内部运营能力时，相关云函数已配置：
   - `MEMBERSHIP_OPS_OPENIDS`
3. 小程序主链路云函数已部署到最新版本

当前阶段不用准备：

1. `WECHAT_PAY_APPID`
2. `WECHAT_PAY_MCHID`
3. `WECHAT_PAY_NOTIFY_URL`
4. `WECHAT_PAY_PRIVATE_KEY`
5. `WECHAT_PAY_SERIAL_NO`

## 当前建议

### 什么时候可以不配支付环境变量

你只要满足以下条件，就可以暂时不配：

1. 当前目标是继续开发和内部试跑
2. 当前不要求真实用户在线付款
3. 当前主要验证：
   - 会员门禁
   - 开通/续费文案
   - 手工开会员后的访问效果
   - 续费顺延和过期规则
   - 异常排查和补单流程

### 什么时候必须开始配置支付环境变量

当你要验证以下任一项时，才需要开始配置：

1. 真实拉起微信支付
2. 真实支付后回调
3. 真实支付成功自动开会员
4. 真实查单和补单

到那时再配置以下变量即可：

- `WECHAT_PAY_APPID`
- `WECHAT_PAY_MCHID`
- `WECHAT_PAY_NOTIFY_URL`
- `WECHAT_PAY_PRIVATE_KEY`
- `WECHAT_PAY_SERIAL_NO`

## 无商户时，用户测试流程怎么改

和“有真实支付”相比，当前测试流程的核心变化只有一条：

1. 不再把“支付成功”当成真实用户动作去测试
2. 改成把“订单写入成功 + 手工把订单推进到 paid + 再调用 refreshMembershipOrder”作为替代闭环

也就是：

- 用户侧继续走正常页面入口
- 管理/测试侧用数据库记录和内部能力补上“支付成功”这一步

### 你现在不测什么

当前阶段先不测：

1. 真实微信支付面板
2. 真实商户回调
3. 真实资金收款
4. 真实查单与支付对账

### 你现在继续重点测什么

当前阶段继续测：

1. 登录与用户档案初始化
2. 列表浏览和详情门禁
3. 开通/续费入口文案与跳转
4. 订单创建是否正确
5. 手工模拟支付成功后，会员是否正常生效
6. 续费顺延和过期重开是否正确
7. 内部诊断、人工修正、经营分析是否可用
8. 人工评估、成果物和 Web 服务导流是否可消费

## 推荐测试流程

下面这套流程是“当前没有支付商户时”的推荐主路径。  
如果你后续继续内部试跑，优先按这套流程准备数据和执行手测。

### Phase 1：基础访问链路

目标：

1. 验证 `Epic 1` 的登录、列表、详情和会员三态门禁

步骤：

1. 正常登录小程序
2. 浏览列表并进入详情
3. 先删除当前 `openid` 的 `miniapp_memberships` 记录，验证未开通状态
4. 手工改成 `active` 会员记录，验证完整详情解锁
5. 手工改成 `expired` 会员记录，验证续费拦截

### Phase 2：无支付情况下的“伪支付闭环”

目标：

1. 验证 `Epic 2` 的订单、首次开通、续费和留痕

步骤：

1. 用户仍从详情页或会员状态页点击“立即开通 / 立即续费”
2. `createMembershipOrder` 会创建订单
3. 页面提示当前环境未完成支付配置
4. 到数据库中把目标订单改成 `paid`
5. 再调用 `refreshMembershipOrder`
6. 验证：
   - `miniapp_memberships` 被写成 `active`
   - 订单状态进入 `granted`
   - `status_history` 有完整留痕
   - 用户重新进入详情后可见完整内容

### Phase 3：过期后续费

目标：

1. 验证 `Story 2.3`

步骤：

1. 先把当前会员记录改成 `expired`
2. 再创建一条 `renew` 类型订单
3. 手工把订单改成 `paid`
4. 调用 `refreshMembershipOrder`
5. 验证：
   - 如果之前仍有效，则按到期时间顺延
   - 如果已经过期，则按新的 `paid_at` 重算有效期

### Phase 4：异常处理闭环

目标：

1. 验证 `Epic 3`

步骤：

1. 使用命中 `MEMBERSHIP_OPS_OPENIDS` 的账号打开：
   - `/pages/ops-membership-diagnostics/index`
2. 按 `openid` 或 `outTradeNo` 查询
3. 执行人工补开或状态修正
4. 页面自动回查确认
5. 验证：
   - `miniapp_membership_ops_log` 有记录
   - 会员或订单状态已被更新

### Phase 5：留存、经营和内容升级

目标：

1. 验证 `Epic 4` 和 `Epic 5`

步骤：

1. 用 `active / expired / inactive` 三种状态测试会员状态页
2. 开启站内提醒并验证入口回流
3. 用白名单账号写人工评估关联
4. 用有效会员打开详情，验证：
   - 结构化评估正文
   - Excel 成果物
   - 进一步服务导流入口
5. 用白名单账号进入经营分析页，确认指标会增长

## 当前测试模型

内部验证阶段，建议始终同时维护两类数据：

1. `miniapp_memberships`
2. `miniapp_membership_orders`

### 推荐状态模型

#### 会员表 `miniapp_memberships`

- `inactive`
- `active`
- `expired`

#### 订单表 `miniapp_membership_orders`

- `pay_pending`
- `paid`
- `failed`
- `cancelled`

### 当前原则

1. 要测试“未支付/未完成”
   - 只写订单
   - 不写有效会员

2. 要测试“支付成功后已开会员”
   - 写 `paid` 订单
   - 再调用 `refreshMembershipOrder`
   - 或者临时手工写 `active` 会员记录

3. 要测试“支付失败/取消”
   - 只写 `failed` 或 `cancelled` 订单
   - 不写有效会员

4. 一个 `openid` 最好只保留一条 `miniapp_memberships` 主记录

5. 一个 `openid` 可以保留多条订单记录，用于模拟历史支付轨迹

## 手工测试数据模板

把下面的 `YOUR_OPENID` 和 `你的source_item_id` 改成实际值。

### 场景 1：下单已创建，但还没有开会员

用途：

- 验证订单已落库
- 验证用户仍不能看完整详情
- 验证后续支付成功前不应提前授予会员

集合：`miniapp_membership_orders`

```json
{
  "out_trade_no": "manual-order-pending-001",
  "openid": "YOUR_OPENID",
  "plan_code": "monthly_20",
  "order_type": "open",
  "amount_fen": 2000,
  "currency": "CNY",
  "status": "pay_pending",
  "wx_prepay_id": "mock-prepay-id-001",
  "wx_transaction_id": "",
  "notify_received_at": null,
  "paid_at": null,
  "effective_from": null,
  "effective_until": null,
  "source_item_id": "你的source_item_id",
  "membership_record_id": "",
  "membership_status_snapshot": "inactive",
  "raw_notify_summary": "",
  "created_at": "2026-03-29T12:00:00.000Z",
  "updated_at": "2026-03-29T12:00:00.000Z"
}
```

预期：

1. 订单存在
2. 用户仍被会员拦截
3. 不应看到完整详情

### 场景 2：模拟首次开通成功

用途：

- 验证支付成功后的会员访问效果
- 验证开通后详情可见

集合：`miniapp_membership_orders`

```json
{
  "out_trade_no": "manual-order-paid-001",
  "openid": "YOUR_OPENID",
  "plan_code": "monthly_20",
  "order_type": "open",
  "amount_fen": 2000,
  "currency": "CNY",
  "status": "paid",
  "wx_prepay_id": "mock-prepay-id-002",
  "wx_transaction_id": "mock-tx-001",
  "notify_received_at": "2026-03-29T12:10:00.000Z",
  "paid_at": "2026-03-29T12:10:00.000Z",
  "effective_from": "2026-03-29T12:10:00.000Z",
  "effective_until": "2026-04-28T12:10:00.000Z",
  "source_item_id": "你的source_item_id",
  "membership_record_id": "manual-membership-001",
  "membership_status_snapshot": "inactive",
  "raw_notify_summary": "manual mock payment success",
  "created_at": "2026-03-29T12:08:00.000Z",
  "updated_at": "2026-03-29T12:10:00.000Z"
}
```

然后调用：

- 云函数：`refreshMembershipOrder`
- 参数：`{ "outTradeNo": "manual-order-paid-001" }`

调用成功后，系统会自动写入或更新 `miniapp_memberships`。

如果你当前只想快速验证页面效果，也可以直接手工补下面这条会员记录：

集合：`miniapp_memberships`

```json
{
  "_id": "manual-membership-001",
  "openid": "YOUR_OPENID",
  "plan_code": "monthly_20",
  "status": "active",
  "starts_at": "2026-03-29T12:10:00.000Z",
  "expires_at": "2026-04-28T12:10:00.000Z",
  "latest_order_no": "manual-order-paid-001",
  "updated_at": "2026-03-29T12:10:00.000Z"
}
```

预期：

1. 订单状态为 `paid`
2. 会员状态为 `active`
3. 用户可以看到完整详情

### 场景 3：模拟已过期后续费成功

用途：

- 验证过期后的续费逻辑
- 验证续费后重新恢复访问

先把旧会员改成过期：

集合：`miniapp_memberships`

```json
{
  "_id": "manual-membership-001",
  "openid": "YOUR_OPENID",
  "plan_code": "monthly_20",
  "status": "expired",
  "starts_at": "2026-02-01T00:00:00.000Z",
  "expires_at": "2026-02-28T23:59:59.000Z",
  "latest_order_no": "manual-order-old-001",
  "updated_at": "2026-03-01T00:00:00.000Z"
}
```

再补一条续费成功订单：

集合：`miniapp_membership_orders`

```json
{
  "out_trade_no": "manual-order-renew-001",
  "openid": "YOUR_OPENID",
  "plan_code": "monthly_20",
  "order_type": "renew",
  "amount_fen": 2000,
  "currency": "CNY",
  "status": "paid",
  "wx_prepay_id": "mock-prepay-id-003",
  "wx_transaction_id": "mock-tx-002",
  "notify_received_at": "2026-03-29T13:00:00.000Z",
  "paid_at": "2026-03-29T13:00:00.000Z",
  "effective_from": "2026-03-29T13:00:00.000Z",
  "effective_until": "2026-04-28T13:00:00.000Z",
  "source_item_id": "你的source_item_id",
  "membership_record_id": "manual-membership-001",
  "membership_status_snapshot": "expired",
  "raw_notify_summary": "manual mock renew success",
  "created_at": "2026-03-29T12:58:00.000Z",
  "updated_at": "2026-03-29T13:00:00.000Z"
}
```

再调用：

- 云函数：`refreshMembershipOrder`
- 参数：`{ "outTradeNo": "manual-order-renew-001" }`

如果你只是快速验证页面，也可以直接把会员手工改回有效：

集合：`miniapp_memberships`

```json
{
  "_id": "manual-membership-001",
  "openid": "YOUR_OPENID",
  "plan_code": "monthly_20",
  "status": "active",
  "starts_at": "2026-03-29T13:00:00.000Z",
  "expires_at": "2026-04-28T13:00:00.000Z",
  "latest_order_no": "manual-order-renew-001",
  "updated_at": "2026-03-29T13:00:00.000Z"
}
```

预期：

1. 过期会员状态恢复为 `active`
2. `latest_order_no` 指向新的续费订单
3. 用户重新获得完整详情访问权限

## 推荐测试顺序

每次手工验证时，按这个顺序最稳：

1. 无会员
   - 删除当前 `openid` 的 `miniapp_memberships`
   - 验证详情被拦截

2. 下单未完成
   - 插入 `pay_pending` 订单
   - 不写会员
   - 验证仍被拦截

3. 首次开通成功
   - 写 `paid` 订单
   - 写 `active` 会员
   - 验证详情可见

4. 会员过期
   - 把会员改成 `expired`
   - 验证详情出现续费入口

5. 续费成功
   - 写 `renew` 的 `paid` 订单
   - 把会员改回 `active`
   - 验证恢复访问

## 每轮测试建议的最小检查点

每次做无商户测试时，至少确认下面几项：

1. 当前测试账号只有一条有效的 `miniapp_memberships` 主记录
2. 订单表中能清楚区分：
   - 本次测试订单
   - 历史订单
3. `refreshMembershipOrder` 调用后：
   - 订单状态正确推进
   - 会员状态正确更新
4. 详情页表现和数据库状态一致
5. 需要内部操作的页面，只用白名单账号测试

## 当前注意事项

1. 不要为了测试方便，在前台增加“假支付成功”按钮
2. 不要只改 `miniapp_memberships` 而完全不记录订单，否则后面 `Story 2.4 / Epic 3` 的排查路径会失真
3. 如果同一 `openid` 有多条 `miniapp_memberships`，当前逻辑会取“最新一条”，因此最好只保留一条主记录
4. 订单可以保留多条，这正好可以模拟历史轨迹

## 当前模式下的局限

这套方案适合开发和内部验证，但它不能替代真实支付联调。

当前无法通过这份流程验证：

1. 微信支付参数是否正确
2. 微信支付面板是否能正常拉起
3. 支付回调签名与解密是否正确
4. 真实支付到账后的自动开通是否可靠
5. 真实用户支付取消、失败、超时的端到端行为

因此，等你个体户和商户能力具备后，仍然需要补一轮真实支付联调。

## 下次继续时建议

下次继续开发或测试会员功能时，优先按这份文档准备测试数据和执行步骤。  
如果你直接说：

- `按无商户测试文档继续`
- `继续会员手工测试`
- `按 membership-manual-testing 继续`

就按这份文档的流程往下走。
