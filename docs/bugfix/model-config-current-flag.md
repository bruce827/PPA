# 模型配置“设为当前”开关异常修复

## 问题
在模型配置表单中，“设为当前使用”开关始终可用，导致当已有当前模型时仍可在新建/编辑其他模型时开启，违背“仅允许一个当前模型”的约束。

## 修复方案
- 前端在加载模型列表时记录当前模型 ID，并传递给表单。
- 表单根据当前模型 ID 判断：
  - 若已有当前模型且本次操作的新建/编辑目标不是当前模型，则禁用“设为当前使用”开关并提示需先取消当前模型。
  - 若不存在当前模型，则允许开启开关。

## 相关改动
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/index.tsx`：请求列表后存储当前模型 ID，并传入表单。
- `frontend/ppa_frontend/src/pages/ModelConfig/Application/components/ModelForm.tsx`：基于当前模型 ID 控制开关禁用状态与提示。
