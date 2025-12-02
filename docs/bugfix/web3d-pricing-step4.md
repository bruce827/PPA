# Web3D 前端 Step4 定价逻辑修正记录

## 问题概述
- 原实现：在 Web3D 新建评估页 Step1 直接输入日单价；Step4 工作量行仅选择工作项，未按角色单价计算；角色多选/均价、交付系数未覆盖。
- 与 PRD 不符：日单价应统一来源于“参数配置/角色与单价管理”，Step4 需为每个工作项选择角色并按角色均价计算；交付系数参与小计；多选工作项应生成多行。

## 修正方案
- 日单价移出 Step1：不再在 Step1 输入。
- Step4 调整：
  - 类别使用下拉；工作项多选（多选拆分为多行）。
  - 角色多选取均价（均价只读显示），数据源为 `/api/config/roles`。
  - 人天字段表示基准人天；新增“交付系数”，小计=人天×交付系数×均价（万元）。
- 后端保持按角色单价汇总基础成本，再乘风险系数。

## 关联文件
- 前端：`frontend/ppa_frontend/src/pages/Web3D/New.tsx`
- 后端计算（已支持角色单价）：`server/services/web3dProjectService.js`
- 文档：`docs/prd/web3d-assessment-spec.md`，`docs/todo/web3d-assessment-implementation-plan.md`

## 测试/验证
- 手动：Step4 选择角色多选、修改人天与交付系数，观察小计与总报价更新；Step5 总览显示基础成本/风险系数/总报价。
- 自动：未执行（前端改动，受环境限制）；后端 service 层测试需调整角色单价输入用例。
