# PPA 招标快报小程序技术方案

## 1. 技术决策

## 1.1 总体方案

首版采用以下结构：

- 前端：微信原生小程序
- 后端：CloudBase 云函数
- 数据库：CloudBase 文档数据库
- 数据源：后续独立推送程序写入 CloudBase

不采用当前本地 `server/` 作为首版小程序后端，原因如下：

1. 当前 PPA 后端未线上部署，不适合直接支撑微信访问
2. 业务验证需要快，不应先引入服务器部署与运维成本
3. 小程序 + CloudBase 更适合做首版闭环

## 1.2 目录建议

建议在当前仓库内新增：

- `frontend/ppa_miniapp/`

目录责任：

- 小程序代码独立维护
- 不与 `frontend/ppa_frontend/` 混用构建链路
- 数据源关系保留在业务层，而不是前端工程层

## 2. 架构设计

## 2.1 逻辑架构

1. 微信用户打开小程序
2. 小程序调用云函数完成登录与用户初始化
3. 小程序调用列表/详情云函数读取 CloudBase 数据
4. 用户点击采纳或取消采纳
5. 云函数负责并发校验和状态写入
6. 后续独立推送程序负责把 PPA 的招标数据写入 `tenders`

## 2.2 模块划分

### 小程序前端

1. 登录与用户初始化模块
2. 招标列表页模块
3. 日期范围筛选模块
4. 招标详情页模块
5. 采纳交互模块
6. 分享模块

### 云函数

1. `loginUser`
2. `getTenderList`
3. `getTenderDetail`
4. `adoptTender`
5. `cancelTenderAdoption`
6. `upsertTenderBySourceId`

## 3. 数据模型

## 3.1 `tenders` 集合

建议字段：

- `source_item_id`: 数据源业务唯一标识
- `title`: 项目名称
- `published_at`: 发布日期时间戳
- `published_date`: 发布日期字符串，格式 `YYYY-MM-DD`
- `deadline_at`: 截止日期时间戳
- `deadline_date`: 截止日期字符串，格式 `YYYY-MM-DD`
- `issuer`: 招标单位
- `budget_amount`: 预算金额
- `region`: 地区
- `source_platform`: 来源平台
- `source_url`: 原文链接
- `summary`: 项目摘要
- `announcement_html`: 招标公告原始 HTML / 富文本
- `announcement_plain_text`: 招标公告纯文本兜底字段
- `adopt_status`: `unadopted | adopted`
- `adopted_by_openid`: 采纳人微信标识
- `adopted_by_name`: 采纳人展示名称
- `adopted_at`: 采纳时间
- `last_pushed_at`: 最近一次推送时间
- `created_at`: 创建时间
- `updated_at`: 更新时间

说明：

1. `published_date` 与 `deadline_date` 用于简化日期范围查询
2. `announcement_plain_text` 是富文本降级兜底字段
3. `last_pushed_at` 用于判断最新版本

## 3.2 `miniapp_users` 集合

建议字段：

- `openid`
- `nickname`
- `avatar_url`
- `display_name`
- `created_at`
- `last_login_at`

说明：

1. 首版不采集手机号
2. `display_name` 用于页面展示采纳人信息

## 4. 核心业务设计

## 4.1 登录设计

登录方案：

1. 小程序启动后调用 `wx.login`
2. 前端调用 `loginUser` 云函数
3. 云函数基于微信上下文获取 `openid`
4. 首次登录时创建用户记录
5. 非首次登录时更新 `last_login_at`

结果：

- 前端获得当前用户最小信息
- 后续所有业务操作都以 `openid` 作为身份依据

## 4.2 列表查询设计

规则：

1. 默认查询当天数据
2. 支持按开始日期与结束日期做范围筛选
3. 返回列表字段与采纳状态
4. 默认按 `published_at` 倒序

建议查询参数：

- `startDate`
- `endDate`
- `pageNo`
- `pageSize`

## 4.3 去重设计

业务要求是重复推送时只保留最新一条，因此去重应在写入侧完成，而不是查询侧临时处理。

建议规则：

1. 推送程序以 `source_item_id` 作为唯一业务键
2. 写入前先按 `source_item_id` 查找已有记录
3. 若不存在，则新增
4. 若存在，则更新原记录并刷新 `last_pushed_at`、`updated_at`

这样可确保：

1. 前端永远只看到一条最新记录
2. 列表层不需要做复杂去重逻辑

## 4.4 采纳状态设计

### 采纳

1. 前端传入目标 `source_item_id`
2. 云函数读取当前记录
3. 若 `adopt_status = adopted`，返回失败
4. 若未采纳，则写入：
   - `adopt_status = adopted`
   - `adopted_by_openid`
   - `adopted_by_name`
   - `adopted_at`

### 取消采纳

1. 前端传入目标 `source_item_id`
2. 云函数读取当前记录
3. 若当前用户不是采纳人，则返回失败
4. 若是采纳人，则清空采纳相关字段

## 4.5 并发控制

采纳操作必须由云函数执行，不允许前端直改数据库。

原因：

1. 一条招标只能被一个人采纳
2. 多个用户可能同时点击采纳
3. 云函数需要统一做状态校验

首版实现要求：

1. 采纳前必须再次读取当前状态
2. 仅在未采纳时允许写入
3. 返回明确的失败原因，例如“已被他人采纳”

## 4.6 分享设计

分享目标页：

- 当天招标列表页

建议策略：

1. 从列表页触发分享
2. 分享参数带上当日日期，例如 `startDate=today`、`endDate=today`
3. 打开后仍要求微信登录

## 5. 富文本公告策略

## 5.1 存储策略

必须存储：

1. 原始 `announcement_html`
2. 纯文本兜底字段 `announcement_plain_text`

## 5.2 展示策略

首版展示优先级：

1. 可渲染富文本则展示富文本
2. 若富文本结构复杂或样式失真明显，则回退为简化版展示
3. 必要时回退到纯文本展示

## 5.3 验收口径

首版验收以“内容可读”为标准，不以“样式完全一致”为标准。

## 6. 推荐索引与查询约束

建议建立的查询能力：

1. 按 `published_date` 范围查询
2. 按 `deadline_date` 范围查询
3. 按 `source_item_id` 精确查询
4. 按 `adopt_status` 查询

## 7. 安全与权限

1. 所有数据读取都要求已登录微信用户
2. 首版不做白名单控制
3. 采纳与取消采纳必须基于服务端获取到的 `openid`
4. 前端传入的用户标识不能作为可信依据

## 8. 未来推送边界预留

推送程序不在本期实现范围内，但当前已实现 `upsertTenderBySourceId` 作为写入入口。

写入约束如下：

1. 统一写入 `tenders` 集合
2. 统一用 `source_item_id` 做幂等更新
3. 推送程序负责标准化金额、日期与 HTML 字段
4. 推送程序不得直接覆盖采纳状态字段，避免把已采纳状态冲掉
5. 云函数使用 `PUSH_SECRET_KEY` 做最小鉴权，避免被前端直接滥用

## 9. 测试重点

1. 首次登录与重复登录
2. 默认当天列表查询
3. 日期范围筛选正确性
4. 详情查询完整性
5. 重复采纳失败
6. 非采纳人取消采纳失败
7. 相同 `source_item_id` 数据不会重复显示
8. 招标公告复杂 HTML 的降级显示
