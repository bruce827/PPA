# 项目机会-招标网站功能规格

## 1. 功能定位

“招标网站”是 PPA 在“项目机会”域中的主数据维护模块，用于沉淀一份可持续维护的招标来源网站清单，供内部运营、维护和后续采集能力建设使用。

该模块当前承担四类职责：

1. 维护招标网站基础主数据
2. 对站点 URL 做在线校验并保留结果
3. 提供列表查询、编辑和清理能力
4. 为单个站点挂接一份 Python 采集脚本

它的目标不是建设完整爬虫平台，而是先把“站点主数据 + 可校验 URL + 可挂脚本”这条维护链路沉淀下来。

## 2. 当前范围

### 2.1 In Scope

1. 招标网站列表查询
2. 招标网站新建、编辑、删除
3. URL 规范化与唯一性约束
4. 单站点 URL 校验与结果展示
5. 按基础字段和状态字段筛选
6. 为单个站点上传一份 `.py` 脚本
7. 重复上传时覆盖旧脚本

### 2.2 Out of Scope

1. 脚本执行、调试、导入或调度
2. 多脚本管理与版本历史
3. 在线预览、在线编辑、脚本下载
4. 批量上传脚本
5. 权限审批流和多人协作控制
6. 把脚本自动接入未来爬虫项目

## 3. 用户与入口

当前用户角色仍然是内部运营 / 维护人员。

页面入口：

- `/opportunity/bidding-sites`

典型使用路径：

1. 进入招标网站列表
2. 按站点名称、URL、平台类型、是否有脚本等条件筛选
3. 新建或编辑站点
4. 对单个站点发起 URL 校验
5. 为已保存的站点上传 `.py` 脚本

## 4. 数据模型

表：

- `opportunity_bidding_sites`

### 4.1 基础字段

核心字段包括：

1. `name`
2. `alias_name`
3. `url`
4. `normalized_url`
5. `source_level`
6. `province`
7. `city`
8. `platform_type`
9. `is_official`
10. `enabled`
11. `notes`

### 4.2 URL 校验结果字段

校验结果字段包括：

1. `validation_status`
2. `validation_summary`
3. `auth_required`
4. `is_bidding_site`
5. `http_status`
6. `final_url`
7. `redirect_chain_json`
8. `validation_confidence`
9. `validation_payload_json`
10. `last_validated_at`

### 4.3 脚本挂接字段

脚本相关字段包括：

1. `has_script INTEGER NOT NULL DEFAULT 0`
2. `script_filename TEXT`
3. `script_uploaded_at DATETIME`

说明：

1. 一期每个站点只允许绑定 1 份当前有效脚本
2. `has_script` 只表示“当前是否已保存脚本文件”
3. 不单独保存脚本版本历史

### 4.4 数据规则

1. `normalized_url` 必须唯一
2. `normalized_url` 由服务端根据输入 URL 统一规范化
3. 删除站点时应 best-effort 删除本地脚本文件

## 5. 页面与交互要求

### 5.1 列表页

页面：

- `/opportunity/bidding-sites`

列表需要展示的关键信息包括：

1. 网站名称
2. 网址
3. 层级
4. 平台类型
5. 区域
6. 是否官方
7. 是否启用
8. 是否有脚本
9. 校验状态
10. 校验摘要
11. 最近校验时间

操作区保留：

1. `AI校验`
2. `查看结果`
3. `编辑`
4. `删除`

### 5.2 列表筛选项

当前列表需要支持按以下条件筛选：

1. `keyword`
2. `name`
3. `url`
4. `source_level`
5. `platform_type`
6. `is_official`
7. `enabled`
8. `validation_status`
9. `has_script`

其中“是否有脚本”筛选建议采用下拉单选：

1. 全部
2. 有脚本
3. 无脚本

### 5.3 新建 / 编辑弹窗

弹窗需要支持维护基础字段：

1. 网站名称
2. 别名
3. 网址
4. 层级
5. 平台类型
6. 省份
7. 城市
8. 是否官方
9. 是否启用
10. 备注

在编辑态中还需展示一个“采集脚本”区块，包含：

1. 当前是否已有脚本
2. 当前文件名
3. 最近上传时间
4. 上传 / 重新上传按钮

交互规则：

1. 新建态可以录入基础字段，但不能直接上传脚本
2. 只有站点保存成功并拥有有效 `id` 后才允许上传脚本
3. 脚本上传动作独立于表单保存动作

### 5.4 校验结果弹窗

“查看结果”弹窗需要展示：

1. 当前校验状态
2. 是否启用
3. 是否官方
4. 是否有脚本
5. 当前 URL
6. 校验摘要
7. 结构化校验结果 JSON
8. 若已有脚本，则展示脚本文件名和上传时间

## 6. 后端接口

### 6.1 列表与详情

1. `GET /api/opportunity/bidding-sites`
2. `GET /api/opportunity/bidding-sites/:id`

列表接口返回中应包含：

1. 站点基础字段
2. 校验结果字段
3. `has_script`
4. `script_filename`
5. `script_uploaded_at`

列表接口应支持 `has_script=true|false` 查询参数。

### 6.2 新建与编辑

1. `POST /api/opportunity/bidding-sites`
2. `PUT /api/opportunity/bidding-sites/:id`
3. `DELETE /api/opportunity/bidding-sites/:id`

规则：

1. 创建和编辑都要做 URL 规范化
2. 若 `normalized_url` 冲突，必须拒绝保存
3. 编辑基础信息时不得清空已有脚本元数据

### 6.3 URL 校验

接口：

- `POST /api/opportunity/bidding-sites/:id/validate`

规则：

1. 读取站点当前 URL
2. 执行校验逻辑
3. 回写校验结果字段
4. 不影响脚本相关字段

### 6.4 脚本上传

接口：

- `POST /api/opportunity/bidding-sites/:id/script`

一期当前实现采用轻量文本上传，而不是 multipart：

1. Request Header:
   - `Content-Type: text/plain`
   - `X-Script-Filename: <urlencoded filename>`
2. Request Body:
   - 脚本纯文本内容

响应返回：

1. 最新站点记录
2. 更新后的 `has_script`
3. `script_filename`
4. `script_uploaded_at`

## 7. 脚本文件存储约定

### 7.1 存储位置

脚本文件保存在服务端本地目录，例如：

- `server/uploads/bidding-site-scripts/`

### 7.2 命名规则

当前采用固定命名：

- `site_{id}.py`

示例：

- `server/uploads/bidding-site-scripts/site_12.py`

### 7.3 覆盖规则

1. 同一站点再次上传脚本时，直接覆盖旧文件
2. 只保留最新一份脚本
3. 上传成功后回写：
   - `has_script = 1`
   - `script_filename`
   - `script_uploaded_at`

### 7.4 删除规则

删除站点时，服务端应尝试删除对应脚本文件。

如果脚本文件删除失败：

1. 记录日志
2. 不阻断主记录删除

## 8. 校验与约束

### 8.1 URL 约束

1. `url` 必须以 `http://` 或 `https://` 开头
2. `url` 必须能被服务端解析为合法 URL
3. `normalized_url` 必须唯一

### 8.2 脚本文件约束

1. 仅允许 `.py` 文件
2. 文件名不能为空
3. 文件内容不能为空
4. 文件大小限制为 `<= 1MB`
5. 不信任客户端路径，只保存安全的 basename

### 8.3 安全边界

系统只负责“保存脚本文件”，不负责“执行脚本文件”。

必须保证：

1. 上传后不自动运行脚本
2. 不做 `import`、语法执行或沙箱测试
3. 文件目录不作为公开静态资源目录暴露

## 9. 业务规则

1. 一个站点在一期只能绑定一份当前有效脚本
2. URL 校验与脚本上传互不影响
3. 上传脚本失败时，不得错误更新 `has_script`
4. 站点原本已有脚本且本次上传失败时，必须保留旧脚本状态
5. 编辑基础信息时，不得覆盖脚本状态

## 10. 验收标准

### AC1 创建与唯一性

Given 用户新建一个合法 URL 的招标网站  
When 保存成功  
Then 系统返回站点记录  
And `normalized_url` 被正确生成

Given 已存在相同 `normalized_url` 的站点  
When 再次创建或编辑为同一规范化 URL  
Then 系统返回 400  
And 提示该网址已存在

### AC2 列表查询

Given 系统中存在多个招标网站  
When 用户按名称、URL 或其他筛选条件查询  
Then 列表返回符合条件的记录

### AC3 URL 校验

Given 某站点已存在  
When 用户点击 `AI校验`  
Then 系统回写校验状态和结构化结果  
And 不影响该站点的脚本状态

### AC4 脚本上传成功

Given 某招标网站已存在且没有脚本  
When 用户在编辑弹窗上传合法 `.py` 文件  
Then 上传成功  
And 该站点 `has_script = true`  
And 返回 `script_filename` 与 `script_uploaded_at`

### AC5 脚本筛选

Given 系统中同时存在“有脚本”和“无脚本”的站点  
When 用户把“是否有脚本”筛选为“有脚本”  
Then 列表仅返回 `has_script = true` 的记录

Given 系统中同时存在“有脚本”和“无脚本”的站点  
When 用户把“是否有脚本”筛选为“无脚本”  
Then 列表仅返回 `has_script = false` 的记录

### AC6 脚本覆盖

Given 某站点已有旧脚本  
When 用户再次上传新的 `.py` 文件  
Then 新文件覆盖旧文件  
And `script_filename` 与 `script_uploaded_at` 更新为最新值

### AC7 非法脚本拦截

Given 用户尝试上传非 `.py` 文件或空文件内容  
When 发起上传  
Then 系统返回 400  
And 保留该站点原有脚本状态

### AC8 删除联动

Given 某站点已绑定脚本  
When 用户删除该站点  
Then 数据库主记录被删除  
And 服务端尝试删除对应本地脚本文件

## 11. 后续扩展方向

在不推翻当前设计的前提下，后续可以继续扩展：

1. 脚本下载
2. 脚本删除
3. 脚本内容预览
4. 多脚本 / 版本管理
5. 与未来采集项目、调度任务或爬虫工程正式挂接
