# 数据初始化脚本说明

## 概述

本目录包含用于初始化系统基础数据的脚本。

## 可用脚本

### 1. seed-roles.js - 角色数据初始化

根据 CSV 文件中的项目角色信息，向数据库中添加初始角色数据。

**包含的角色：**
- 项目经理（1600元/人天）
- 技术经理（1800元/人天）
- UI设计师（1200元/人天）
- DBA（1500元/人天）
- 产品经理（1400元/人天）
- 后端开发（1500元/人天）
- 前端开发（1400元/人天）
- 测试工程师（1200元/人天）
- 实施工程师（1300元/人天）

**运行方式：**
```bash
cd server
node seed-roles.js
```

**注意事项：**
- 脚本会先清空 `config_roles` 表中的现有数据，然后插入新数据
- 如果不希望清空现有数据，请修改脚本中的 `clearExistingData()` 调用
- 单价可以根据实际市场情况在脚本中调整

### 2. seed-risk-items.js - 风险评估项初始化

初始化风险评估项配置数据。

**运行方式：**
```bash
cd server
node seed-risk-items.js
```

### 3. seed-travel-costs.js - 差旅成本初始化

根据 CSV 文件中的差旅成本信息，向数据库中添加初始差旅成本数据。

**包含的成本项：**
- 市内通勤（1500元/人/月）
- 住宿（6000元/人/月）
- 餐补（900元/人/月）
- 出差补助（2400元/人/月）
- **总计：10800元/人/月**

**运行方式：**
```bash
cd server
node seed-travel-costs.js
```

**注意事项：**
- 脚本会先清空 `config_travel_costs` 表中的现有数据，然后插入新数据
- 如果不希望清空现有数据，请修改脚本中的 `clearExistingData()` 调用
- 费用可以根据实际情况在脚本中调整

## 数据库初始化流程

1. 首先运行数据库初始化脚本：
   ```bash
   node init-db.js
   ```

2. 然后运行各个数据初始化脚本：
   ```bash
   node seed-roles.js
   node seed-risk-items.js
   node seed-travel-costs.js
   ```

3. 启动后端服务：
   ```bash
   node index.js
   ```

## 自定义数据

如需修改初始化数据，请直接编辑对应的脚本文件，修改数据数组中的值即可。

例如，修改角色单价：
```javascript
const roles = [
  { role_name: '项目经理', unit_price: 2000 }, // 修改为2000元/人天
  // ...
];
```
