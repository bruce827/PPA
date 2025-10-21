# Sprint 8 - 组件化重构 New.tsx

**日期**: 2025-10-21  
**重构范围**: `frontend/ppa_frontend/src/pages/Assessment/New.tsx`

## 重构原因

原 `New.tsx` 文件过于臃肿，包含约 900 行代码，所有子组件都定义在同一个文件中，导致：
- 代码可读性差
- 难以维护和调试
- 组件复用困难
- 违反单一职责原则

## 重构方案

### 组件拆分

将 4 个步骤分别封装为独立的组件文件，按照 Ant Design Pro 推荐的目录结构：

```
src/pages/Assessment/
├── New.tsx                        # 主容器组件 (265行)
└── components/                    # 子组件目录
    ├── RiskScoringForm.tsx       # 步骤1: 风险评分 (110行)
    ├── WorkloadEstimation.tsx    # 步骤2: 工作量估算 (454行)
    ├── OtherCostsForm.tsx        # 步骤3: 其他成本 (55行)
    └── Overview.tsx              # 步骤4: 生成总览 (123行)
```

### 文件说明

#### 1. **New.tsx** - 主容器组件
- **职责**: 
  - 管理全局状态（current, loading, configData, assessmentData）
  - 协调子组件交互
  - 计算风险评分摘要
  - 渲染顶部统计卡片和步骤导航
- **代码量**: 265 行（原 900 行）
- **核心逻辑**:
  ```typescript
  - useEffect: 加载配置和项目数据
  - riskScoreSummary: 计算风险等级
  - handleValuesChange: 更新评估数据
  - steps: 定义4个步骤的内容
  ```

#### 2. **RiskScoringForm.tsx** - 风险评分表单
- **职责**: 
  - 风险评估项选择
  - 一键填充测试数据
  - 表单验证和提交
- **Props**:
  ```typescript
  {
    form: FormInstance;
    initialValues: API.AssessmentData;
    configData: ConfigData | null;
    onValuesChange: (changed, all) => void;
    onNext: () => void;
  }
  ```
- **特性**: 
  - 使用 ProFormSelect 动态渲染风险项
  - 支持样例数据快速填充
  - 响应式布局 (8列栅格)

#### 3. **WorkloadEstimation.tsx** - 工作量估算表格
- **职责**:
  - 新功能开发工作量表
  - 系统对接工作量表
  - 数据验证和归一化
  - 样例数据填充
- **Props**:
  ```typescript
  {
    configData: ConfigData;
    initialValues: { dev, integration };
    onWorkloadChange: (dev, integration) => void;
    onPrev: () => void;
    onNext: () => void;
  }
  ```
- **核心功能**:
  - EditableProTable 双 Tab 表格
  - 动态生成角色列
  - 自动计算工时
  - 行内编辑/删除/详情

#### 4. **OtherCostsForm.tsx** - 其他成本表单
- **职责**:
  - 差旅成本输入
  - 运维成本输入
  - 风险成本列表管理
- **Props**:
  ```typescript
  {
    form: FormInstance;
    initialValues: API.AssessmentData;
    onValuesChange: (values) => void;
    onPrev: () => void;
    onNext: () => void;
  }
  ```
- **特性**:
  - ProFormList 动态风险项
  - 分组表单布局
  - 导航按钮

#### 5. **Overview.tsx** - 生成总览与保存
- **职责**:
  - 调用计算 API
  - 展示报价明细
  - 项目保存
  - 页面跳转
- **Props**:
  ```typescript
  {
    assessmentData: API.AssessmentData;
    configData: ConfigData;
    onPrev: () => void;
  }
  ```
- **核心功能**:
  - calculateProjectCost 计算报价
  - createProject 保存项目
  - 错误处理和用户反馈
  - 模板选项

## 重构优势

### 1. **代码组织清晰**
- ✅ 主文件缩减 70% (900行 → 265行)
- ✅ 每个组件职责单一明确
- ✅ 符合 SOLID 原则

### 2. **可维护性提升**
- ✅ 独立组件易于定位和修改
- ✅ 减少代码耦合
- ✅ 便于单元测试

### 3. **可复用性增强**
- ✅ 组件可在其他页面复用
- ✅ 便于创建模板页面
- ✅ 支持 Storybook 文档化

### 4. **开发体验改善**
- ✅ IDE 性能提升（小文件加载快）
- ✅ 代码审查更容易
- ✅ 多人协作冲突减少

### 5. **符合最佳实践**
- ✅ 遵循 Ant Design Pro 项目结构
- ✅ 组件化设计模式
- ✅ Props 类型明确

## 数据流设计

### 状态管理
```
New.tsx (主容器)
  ├─ configData (配置数据)
  ├─ assessmentData (评估数据)
  └─ current (当前步骤)
       │
       ↓
  ┌────────────────────────────┐
  │  Step 1: RiskScoringForm   │ → onValuesChange → assessmentData.risk_scores
  └────────────────────────────┘
       │ onNext
       ↓
  ┌────────────────────────────┐
  │ Step 2: WorkloadEstimation │ → onWorkloadChange → assessmentData.workload
  └────────────────────────────┘
       │ onNext
       ↓
  ┌────────────────────────────┐
  │  Step 3: OtherCostsForm    │ → onValuesChange → assessmentData.costs
  └────────────────────────────┘
       │ onNext
       ↓
  ┌────────────────────────────┐
  │     Step 4: Overview       │ → createProject → history.push
  └────────────────────────────┘
```

### Props 传递
- **单向数据流**: 父组件传递数据和回调函数
- **状态提升**: 所有共享状态在 New.tsx 管理
- **回调通信**: 子组件通过回调函数通知父组件

## 迁移说明

### 无需修改的部分
- ✅ 路由配置（路径不变）
- ✅ API 接口调用
- ✅ 类型定义（使用 API 命名空间）
- ✅ 业务逻辑（完整保留）

### 已验证
- ✅ TypeScript 编译通过
- ✅ ESLint 无错误
- ✅ 组件 Props 类型正确
- ✅ 导入路径有效

### 待测试
- ⏳ 功能完整性测试
- ⏳ 步骤间导航测试
- ⏳ 数据持久化测试
- ⏳ 编辑模式测试

## 后续优化建议

### 1. **进一步抽取公共逻辑**
- 将 `normalizeRow`, `normalizeList` 抽取为 utils
- 将 `parseRiskOptions` 移到独立工具文件
- 统一的样例数据配置文件

### 2. **增强组件功能**
- WorkloadEstimation 添加导出功能
- Overview 添加 PDF 导出
- 实现详情弹窗（目前只有占位）

### 3. **性能优化**
- 使用 React.memo 优化重渲染
- 大数据表格虚拟滚动
- 懒加载 Tab 内容

### 4. **单元测试**
- 为每个组件编写测试
- Mock services 层
- 测试用户交互流程

### 5. **文档完善**
- 添加组件注释和 JSDoc
- Storybook 示例
- 使用说明文档

## 相关文件

### 新建文件
- ✅ `components/RiskScoringForm.tsx` (110行)
- ✅ `components/WorkloadEstimation.tsx` (454行)
- ✅ `components/OtherCostsForm.tsx` (55行)
- ✅ `components/Overview.tsx` (123行)

### 修改文件
- ✅ `New.tsx` (重写为容器组件, 265行)

### 依赖关系
```
New.tsx
├── components/RiskScoringForm
├── components/WorkloadEstimation
├── components/OtherCostsForm
├── components/Overview
└── @/services/assessment (API层)
```

## 验证清单

- [x] TypeScript 类型检查通过
- [x] ESLint 无警告
- [x] 文件结构符合规范
- [x] 组件导入路径正确
- [x] Props 类型定义完整
- [ ] 功能测试通过
- [ ] 性能无明显下降
- [ ] 用户体验一致

## 总结

本次重构将一个 900 行的巨型组件拆分为 5 个清晰的模块，大幅提升了代码的可读性和可维护性。遵循了 Ant Design Pro 的最佳实践，为后续功能扩展和团队协作打下良好基础。

**代码行数对比**:
- **重构前**: 1 个文件，900 行
- **重构后**: 5 个文件，总计 1007 行（主文件仅 265 行）
- **主文件缩减**: 70%
- **平均文件大小**: 200 行（更易维护）
