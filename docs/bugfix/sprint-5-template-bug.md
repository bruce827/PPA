
# Sprint #5 Bug报告：从模板创建功能未生效

*   **领域:** 前端
*   **时间:** Sprint #5 验证期间

## 1. 问题描述

在“新建评估”页面，当从顶部的“从模板创建”下拉框中选择一个已保存的模板时，页面下方的所有表单（风险评分、工作量估算等）未能自动填充该模板的数据。

## 2. 原因分析

初步判断问题在于数据流和组件的重新渲染机制。`handleTemplateChange` 函数在获取到模板数据后，调用了顶层的 `setAssessmentData` 来更新状态。然而，`ProForm` 和 `ProTable` 等子组件可能没有正确地监听这个顶层状态的变化，或者它们的 `initialValues` 属性只在组件首次挂载时生效，导致后续的状态更新无法触发UI的填充。

## 3. 解决方案思路 (待实现)

不能仅仅依赖React的声明式状态更新。需要在 `handleTemplateChange` 函数中，采用更命令式的方式来触发表单填充：

1.  **风险评分表单:** 需要获取 `ProForm` 的 `form` 实例，并在加载数据后调用 `form.setFieldsValue(loadedData.risk_scores)`。
2.  **工作量估算表单:** 需要将加载到的 `development_workload` 和 `integration_workload` 数据，通过 `props` 直接传递给 `WorkloadEstimation` 组件，并在该组件内部使用 `useState` 的 `set` 方法来更新其 `dataSource`。
3.  **其他成本表单:** 与风险评分表单类似，也需要通过 `form` 实例来设置值。

这需要将 `form` 实例从子组件传递到父组件，或者在父组件中创建 `form` 实例并传递下去，需要对现有组件结构进行一定的重构。
