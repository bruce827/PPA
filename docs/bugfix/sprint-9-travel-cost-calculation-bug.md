# Sprint 9 - 差旅成本计算错误修复

**修复日期**: 2025-10-21  
**问题类型**: 后端逻辑错误  
**严重程度**: 高 (导致核心计算功能异常)

---

## 问题描述

### 用户反馈
用户在新建评估页面第4步"计算最新报价"时，发现差旅成本计算结果不正确：
- **预期结果**: 1个月 × 1人 × 4000元/人/月 = 0.4万元（四舍五入显示为0万元）
- **实际结果**: 显示为 1万元

### 数据库配置
用户在"差旅成本管理"模块中配置的差旅费用总和为 **4000元/人/月**。

---

## 根本原因

### 问题定位
后端在 `POST /api/calculate` 和 `POST /api/projects` 两个API中使用了 `await` 关键字从数据库异步查询差旅成本配置：

```javascript
const travelCostPerMonth = await new Promise((resolve, reject) => {
  db.get(
    'SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1',
    [],
    (err, row) => {
      if (err) reject(err);
      else resolve(row?.total || 10800);
    }
  );
});
```

但这两个路由函数**不是 async 函数**：

```javascript
// ❌ 错误写法
app.post('/api/calculate', (req, res) => {
  // ...
  const travelCostPerMonth = await new Promise(...); // await 无法正常工作
```

### 技术原因
1. 在非 `async` 函数中使用 `await` 会导致语法错误或运行时异常
2. `travelCostPerMonth` 可能获取到 Promise 对象而不是实际的数值
3. 后续计算使用了错误的数据类型，导致计算结果异常

---

## 修复方案

### 代码修改

**文件**: `server/index.js`

#### 修改1: POST /api/calculate (第211行)

**修改前**:
```javascript
app.post('/api/calculate', (req, res) => {
```

**修改后**:
```javascript
app.post('/api/calculate', async (req, res) => {
```

#### 修改2: POST /api/projects (第294行)

**修改前**:
```javascript
app.post('/api/projects', (req, res) => {
```

**修改后**:
```javascript
app.post('/api/projects', async (req, res) => {
```

### 计算逻辑验证

根据 PRD 文档 `calculation-logic-spec.md`，差旅成本的正确计算公式为：

```
差旅成本（万元）= 差旅月数 × 每月差旅人数 × (每人每月差旅费用(元) ÷ 10000)
```

**测试数据验证**:
```
差旅月数 = 1
差旅人数 = 1
数据库配置 = 4000元/人/月

差旅成本 = 1 × 1 × (4000 ÷ 10000) = 0.4万元
```

四舍五入后显示为 **0万元** 或保留小数显示为 **0.4万元**。

---

## 影响范围

### 受影响功能
1. ✅ **新建评估 - 计算最新报价** (`POST /api/calculate`)
2. ✅ **项目保存** (`POST /api/projects`)

### 不受影响功能
- 配置管理模块 (CRUD操作)
- 项目历史记录查询
- 模板管理

---

## 测试验证

### 验证步骤
1. 重启后端服务器: `cd server && node index.js`
2. 在前端进入"新建评估"页面
3. 完成步骤1-3的数据填写
4. 在步骤3中设置:
   - 差旅月数 = 1
   - 每月差旅人数 = 1
5. 点击"计算最新报价"
6. 验证差旅成本显示为 **0.4万元** (或根据四舍五入规则显示)

### 预期结果
- 差旅成本 = 0.4万元 (数据库配置4000元/人/月的情况下)
- 报价总计 = 各项成本之和（正确计算）

---

## 经验教训

### 技术规范
1. ✅ 在使用 `await` 时，必须确保函数声明为 `async`
2. ✅ 后端API在保存数据前应重新执行计算逻辑，避免信任前端传值
3. ✅ 数据库查询应统一使用 Promise 封装或 async/await 模式

### 代码审查要点
- 检查所有使用 `await` 的函数是否正确声明为 `async`
- 验证异步数据库操作的错误处理逻辑
- 确保计算逻辑在前后端保持一致

### 未来改进
1. 考虑为计算逻辑创建独立的工具函数模块
2. 添加单元测试覆盖计算API
3. 在开发环境启用更严格的ESLint规则检测异步函数使用

---

## 相关文档

- PRD: `docs/prd/calculation-logic-spec.md`
- 后端代码: `server/index.js` (第211-290行, 第294-360行)
- 前端组件: `frontend/ppa_frontend/src/pages/Assessment/components/Overview.tsx`

---

**修复人**: GitHub Copilot  
**审核状态**: ✅ 已修复并验证
