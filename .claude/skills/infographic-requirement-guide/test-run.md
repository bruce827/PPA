# 测试执行记录（v2.3 模板）

## 环境
- 状态文件: `.skills/infographic-requirement-guide/workflow-state.json`
- 产物目录: `.skills/infographic-requirement-guide/outputs/`

## 执行分支

### 分支 A：意图驱动
1. `FR`（workflow_mode=intent-guided）
2. `DT`
3. `IA`
4. `DL`
5. `TG`（可选）
6. `NC`
7. `ANF`（可选）

### 分支 B：数据驱动
1. `FR`（workflow_mode=data-guided）
2. `DT`
3. `EDA`（分析现有数据）
4. `DVZ`（打开 data-to-viz 并回填选择）
5. `MIX`（多种展示方案组合）
6. `TG`（可选）
7. `NC`
8. `ANF`（可选）

## 记录项
- 每一步是否生成预期产物
- `completed_steps` 是否与分支一致
- 重跑上游是否触发失效传播
- `selection_mode` 是否正确（intent-guided / data-guided）
- `selection_entry` 是否正确（rules / website / combo）

## 结果
- [ ] 通过
- [ ] 失败（附失败步骤与原因）
