
# Sprint #6 & #7 Bug报告：编译与逻辑错误

*   **领域:** 前端 / 后端
*   **时间:** Sprint #6 & #7 开发期间

## 1. 前端编译错误

### 1.1 问题描述

在实现“编辑项目”和“模板创建”功能时，对 `src/pages/Assessment/New.tsx` 文件进行了多次不完整的 `replace` 操作，导致了多种编译时语法错误，包括：

1.  **`TypeError: Duplicate declaration "..."`**: 重复导入模块。
2.  **`SyntaxError: 'return' outside of function`**: 破坏了React组件的函数体结构。
3.  **`ReferenceError: ... is not defined`**: 在重构过程中，意外删除了处理函数（如 `handleTemplateChange`）的定义。

### 1.2 原因分析

根源在于使用 `replace` 工具进行大规模代码重构时，过于依赖局部替换，而没有保证整个文件作为一个整体的语法正确性。

### 1.3 解决方案

放弃零碎的 `replace` 策略，采用 `write_file` 或一次性的、覆盖整个文件的 `replace` 操作。将所有必需的组件和逻辑一次性写入 `New.tsx` 文件，确保了文件的整体性和语法正确性。

## 2. 后端计算逻辑Bug

### 2.1 问题描述

在 `Task-QA-01` 的严格数据测试中发现，后端的 `/api/calculate` 和 `/api/projects` 接口在计算工作量成本时，使用了硬编码的全局平均单价（`averageUnitPrice = 0.16`），而没有使用从 `config_roles` 表中可以获取到的、每个角色独立的精确单价。

### 2.2 原因分析

这是一个架构设计缺陷。虽然在初期所有角色单价恰好相同，导致计算结果碰巧正确，但这违背了“参数可配置”的设计初衷，是一个潜在的、严重的数据错误源。

### 2.3 解决方案

重构了 `server/index.js` 中的 `calculateWorkloadCost` 辅助函数。将其逻辑从 `SUM(所有人天) * 平均单价` 修正为 `SUM(每个角色的人天 * 该角色的精确单价)`，使得成本计算完全依赖于数据库中的配置。
