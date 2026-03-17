# PPA 招标快报小程序接口约定

## 1. 约定说明

首版采用 CloudBase 云函数作为业务接口层。为便于前端统一处理，所有云函数返回结构建议统一为：

```json
{
  "success": true,
  "data": {},
  "error": ""
}
```

失败时：

```json
{
  "success": false,
  "data": null,
  "error": "错误信息"
}
```

## 2. 云函数清单

1. `loginUser`
2. `getTenderList`
3. `getTenderDetail`
4. `adoptTender`
5. `cancelTenderAdoption`
6. `upsertTenderBySourceId`

## 3. `loginUser`

### 3.1 目的

- 获取当前微信用户身份
- 初始化或更新用户资料

### 3.2 请求参数

```json
{
  "displayName": "Bruce",
  "nickname": "微信昵称",
  "avatarUrl": "https://..."
}
```

说明：

- `displayName` 可选，但建议首次登录时补录
- `nickname`、`avatarUrl` 可由前端获取后传入

### 3.3 返回示例

```json
{
  "success": true,
  "data": {
    "openid": "wx-openid",
    "displayName": "Bruce",
    "nickname": "微信昵称",
    "avatarUrl": "https://..."
  },
  "error": ""
}
```

## 4. `getTenderList`

### 4.1 目的

- 获取当天或日期范围内的招标列表

### 4.2 请求参数

```json
{
  "startDate": "2026-03-16",
  "endDate": "2026-03-16",
  "pageNo": 1,
  "pageSize": 20
}
```

参数规则：

- `startDate`、`endDate` 为空时，服务端默认取当天
- `pageNo` 默认 1
- `pageSize` 默认 20，首版上限建议 50

### 4.3 返回示例

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "source_item_id": "SRC-001",
        "title": "某数字化平台建设项目",
        "published_at": "2026-03-16T09:00:00+08:00",
        "deadline_at": "2026-03-20T18:00:00+08:00",
        "issuer": "某招标单位",
        "budget_amount": 500000,
        "adopt_status": "unadopted",
        "adopted_by_name": ""
      }
    ],
    "pageNo": 1,
    "pageSize": 20,
    "total": 1
  },
  "error": ""
}
```

## 5. `getTenderDetail`

### 5.1 目的

- 获取单条招标详情

### 5.2 请求参数

```json
{
  "sourceItemId": "SRC-001"
}
```

### 5.3 返回示例

```json
{
  "success": true,
  "data": {
    "source_item_id": "SRC-001",
    "title": "某数字化平台建设项目",
    "published_at": "2026-03-16T09:00:00+08:00",
    "deadline_at": "2026-03-20T18:00:00+08:00",
    "issuer": "某招标单位",
    "budget_amount": 500000,
    "region": "辽宁",
    "source_platform": "某平台",
    "source_url": "https://example.com/tender/1",
    "summary": "项目摘要",
    "announcement_html": "<p>招标公告</p>",
    "announcement_plain_text": "招标公告",
    "adopt_status": "adopted",
    "adopted_by_name": "Bruce",
    "adopted_at": "2026-03-16T10:30:00+08:00",
    "updated_at": "2026-03-16T10:30:00+08:00"
  },
  "error": ""
}
```

## 6. `adoptTender`

### 6.1 目的

- 对未采纳的招标执行采纳

### 6.2 请求参数

```json
{
  "sourceItemId": "SRC-001"
}
```

### 6.3 成功返回

```json
{
  "success": true,
  "data": {
    "source_item_id": "SRC-001",
    "adopt_status": "adopted",
    "adopted_by_name": "Bruce",
    "adopted_at": "2026-03-16T10:30:00+08:00"
  },
  "error": ""
}
```

### 6.4 失败返回

```json
{
  "success": false,
  "data": null,
  "error": "该项目已被其他用户采纳"
}
```

## 7. `cancelTenderAdoption`

### 7.1 目的

- 取消当前用户自己的采纳

### 7.2 请求参数

```json
{
  "sourceItemId": "SRC-001"
}
```

### 7.3 成功返回

```json
{
  "success": true,
  "data": {
    "source_item_id": "SRC-001",
    "adopt_status": "unadopted"
  },
  "error": ""
}
```

### 7.4 失败返回

```json
{
  "success": false,
  "data": null,
  "error": "仅采纳人本人可以取消采纳"
}
```

## 8. 错误码建议

首版可以先返回字符串错误信息，同时保留错误码字段扩展位：

```json
{
  "success": false,
  "data": null,
  "error": "该项目已被其他用户采纳",
  "errorCode": "TENDER_ALREADY_ADOPTED"
}
```

建议错误码：

- `UNAUTHORIZED`
- `INVALID_DATE_RANGE`
- `TENDER_NOT_FOUND`
- `TENDER_ALREADY_ADOPTED`
- `ADOPTION_FORBIDDEN`
- `SYSTEM_ERROR`

## 9. 日期范围校验规则

1. `startDate` 不得大于 `endDate`
2. 日期格式统一为 `YYYY-MM-DD`
3. 若未传日期，默认服务端取当天

## 10. `upsertTenderBySourceId`

### 10.1 目的

- 供后续独立推送项目写入招标数据
- 按 `source_item_id` 幂等创建或更新
- 保留已有采纳状态字段

### 10.2 鉴权

该云函数不应由小程序前端直接调用。

建议方式：

- 在 CloudBase 云函数环境变量中配置 `PUSH_SECRET_KEY`
- 调用方传入 `secretKey`
- 两者不匹配时拒绝写入

### 10.3 请求示例

```json
{
  "secretKey": "replace-with-your-push-secret",
  "data": {
    "source_item_id": "1483109627478446081-zhy",
    "title": "海油发展-清洁能源公司珠海地区碳钢管热煨弯管加工服务专有协议",
    "published_at": "2026-03-16T00:00:00+08:00",
    "published_date": "2026-03-16",
    "deadline_at": "2026-03-27T09:00:00+08:00",
    "deadline_date": "2026-03-27",
    "issuer": "中海油能源发展股份有限公司",
    "source_platform": "中国海洋石油集团有限公司采办业务管理与交易系统",
    "source_url": "https://buy.cnooc.com.cn/cbjyweb/001/001001/20260316/1483109627478446081-zhy.html",
    "summary": "招标人提供没有防腐涂层的裸钢管作为弯管母材，投标人进行热煨弯管加工和检验等相关工作。",
    "announcement_html": "<h3>招标公告</h3><p><strong>项目概况：</strong>...</p>",
    "announcement_plain_text": "项目概况：...",
    "detail_payload": {
      "project_name": "海油发展-清洁能源公司珠海地区碳钢管热煨弯管加工服务专有协议",
      "bid_package_no": "26-CNCCC-FW-GK-0786/01"
    },
    "last_pushed_at": "2026-03-16T00:00:00+08:00"
  }
}
```

### 10.4 返回示例

```json
{
  "success": true,
  "data": {
    "action": "updated",
    "source_item_id": "1483109627478446081-zhy",
    "adopt_status": "adopted",
    "updated_at": "2026-03-16T16:30:00+08:00",
    "last_pushed_at": "2026-03-16T16:30:00+08:00"
  },
  "error": "",
  "errorCode": ""
}
```

### 10.5 关键规则

1. `source_item_id` 是唯一幂等键
2. 已存在记录时只更新推送侧业务字段
3. 不覆盖 `adopt_status`、`adopted_by_openid`、`adopted_by_name`、`adopted_at`
4. 如未配置 `PUSH_SECRET_KEY`，函数应直接拒绝调用
