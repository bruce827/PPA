# Web3D 配置页未露出 Tab 的修复记录

## 问题
- 配置管理页仅包含角色/风险/差旅 tab，Web3D 风险配置虽有独立页面但未在主配置页露出，使用上不便且与 PRD 8.4 “配置管理 - Web3D 风险评估”不符。

## 修复
- 在 `frontend/ppa_frontend/src/pages/Config.tsx` 的 Tabs 中新增“Web3D 风险配置”页签，内嵌现有 `Config/Web3DRisk` 组件，直接维护 Web3D 风险项和工作量模板。

## 影响范围
- 前端配置页 UI；数据接口仍使用 `/api/web3d/config/*`，功能保持一致。
- 路由保持 `/config/web3d-risk` 可直达，新增 Tab 提升可发现性。

## 验证
- 本地构建通过（`npm run build`）。
- 手动：进入“参数配置”页面可见“Web3D 风险配置”Tab，正常加载/CRUD Web3D 风险项和工作量模板。
