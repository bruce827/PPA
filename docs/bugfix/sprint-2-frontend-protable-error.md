
# Sprint #2 问题报告：ProTable 新建功能报错

*   **领域:** 前端
*   **时间:** Sprint #2 开发期间

## 1. 问题描述

在“参数配置”页面的“角色与单价管理”和“差旅成本管理”的Tab页中，点击“新建”按钮时，应用崩溃，浏览器控制台抛出以下错误：

```
Uncaught Error: 请设置 recordCreatorProps.record 并返回一个唯一的key
```

## 2. 排查过程

1.  **初步诊断 (错误):** 最初，根据错误信息中的 `recordCreatorProps` 关键字，错误地将问题定位到了“风险评估项管理”Tab中的 `ProFormList` 组件，并为其添加了 `recordCreatorProps` 属性。但该修复无效，错误依旧。
2.  **重新审查堆栈跟踪:** 仔细分析错误堆栈，发现错误来源于 `addEditRecord` 方法的调用，该方法与 `ProTable` 的行内编辑功能相关，而不是 `ProFormList`。
3.  **定位根本原因:** 错误发生在 `ProTable` 的 `toolBarRender` 中定义的“新建”按钮的 `onClick` 事件里。在调用 `actionRef.current?.addEditRecord?.()` 时，传入的新建记录对象为 `{ id: undefined, ... }`。`ProTable` 在进入可编辑模式时，需要一个临时的、唯一的客户端key来追踪这个新行，而 `undefined` 无法满足此要求。

## 3. 解决方案

修改 `Config.tsx` 文件中，`RoleManagement` 和 `TravelCostManagement` 两个组件的 `toolBarRender` 属性。

在“新建”按钮的 `onClick` 事件中，调用 `addEditRecord` 时，为新纪录的 `id` 赋予一个临时的唯一值。

**修复前:**
```javascript
actionRef.current?.addEditRecord?.({
  id: undefined, 
  // ...
});
```

**修复后:**
```javascript
actionRef.current?.addEditRecord?.({
  id: Date.now(), // 使用时间戳作为临时唯一key
  // ...
});
```

此修改为待保存的新行提供了一个临时的唯一标识，满足了 `ProTable` 组件的要求，问题解决。
