# 前端 Bugfix · 工作量评估提示词弹窗两项修复（2025-11-15）

## 背景
- 在实现“工作量评估 · 提示词模板”弹窗后，控制台出现两个告警：
  1) `[antd: Modal] destroyOnClose is deprecated. Please use destroyOnHidden instead.`
  2) `Instance created by useForm is not connected to any Form element.`

## 修复点
- 修复 1：Modal 废弃属性替换
  - 现象：使用了 `destroyOnClose` 触发 AntD 废弃警告。
  - 处理：改用 `destroyOnHidden`。
  - 位置：frontend/ppa_frontend/src/pages/Assessment/components/WorkloadPromptSelectorModal.tsx:1

- 修复 2：useForm 未关联表单警告
  - 现象：在表单挂载前从 `form.getFieldValue` 读取值用于“预览”，触发未关联告警。
  - 处理：
    - 使用本地状态 `currentVars` 存储变量值；
    - 在 `<Form onValuesChange>` 回调中同步 `currentVars`；
    - 预览生成改为依赖 `currentVars`，不再直接读取 `form` 实例。
  - 位置：frontend/ppa_frontend/src/pages/Assessment/components/WorkloadPromptSelectorModal.tsx:1

## 验收
- 页面不再出现上述两类告警；交互不变，预览随变量变更即时更新。

## 影响范围
- 仅影响“工作量评估 · 提示词模板”弹窗组件；其他 Modal 若仍使用 `destroyOnClose`，可按此方式统一替换。

