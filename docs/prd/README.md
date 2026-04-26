# PRD 文档索引

本目录包含软件项目评估系统（PPA）的完整产品需求文档。

## 文档结构

### 主文档

**[PRD.md](../PRD.md)** - 产品需求文档总览（功能规格索引 + 架构/非功能需求）

**[project-overview.md](./project-overview.md)** - 项目功能架构总览

### 详细功能规格（已实现）

| 文档 | 功能模块 | 状态 |
|------|---------|------|
| [web3d-assessment-spec.md](./web3d-assessment-spec.md) | Web3D 项目评估 | ✅ |
| [model-config-spec.md](./model-config-spec.md) | AI 模型与提示词管理 | ✅ 含 v1.2 update |
| [business-pricing-spec.md](./business-pricing-spec.md) | 商务报价 | ✅ |
| [attachment-push-spec.md](./attachment-push-spec.md) | 附件管理与项目推送 | ✅ |
| [miniapp-internal-channel-spec.md](./miniapp-internal-channel-spec.md) | 小程序内部渠道 | ✅ |
| [miniapp-membership-payment-spec.md](./miniapp-membership-payment-spec.md) | 小程序会员支付 | ✅ |
| [miniapp-bidding-prd.md](./miniapp-bidding-prd.md) | 招标快报小程序 | ✅ |
| [opportunity-bidding-sites-spec.md](./opportunity-bidding-sites-spec.md) | 招标网站 / 爬虫 / 全网检索 | ✅ 含 §12/§13 |
| [opportunity-tender-staging-spec.md](./opportunity-tender-staging-spec.md) | 项目机会 / 待推送招标 | ✅ |
| [risk-score-extended-sources-prd.md](./risk-score-extended-sources-prd.md) | 风险评分扩展（AI未匹配+自定义风险） | ✅ |
| [template-refactor-prd.md](./template-refactor-prd.md) | 评估模板与一键填充 | ⚠️ 部分实现 |
| [ai-risk-assessment-backend-step1.md](./ai-risk-assessment-backend-step1.md) | AI 风险评估后端 | ✅ |
| [workload-one-click-evaluation-prd.md](./workload-one-click-evaluation-prd.md) | 一键工作量评估 | ✅ |
| [AI-log-monitoring-prd.md](./AI-log-monitoring-prd.md) | AI 日志监控系统 | ✅ |

### 未来功能（规划中）

| 文档 | 功能模块 |
|------|---------|
| [ai-project-tags-and-contract-recommendation-prd.md](./ai-project-tags-and-contract-recommendation-prd.md) | AI 项目标签与业绩推荐 | ✅ 已完成 |

### 已废弃

- ~~automated-testing-prd.md~~ → 并入各功能规格
- ~~new-assessment-risk-step-fix.md~~ → 并入 assessment-spec（原已删除）
- ~~template-import-feature.md~~ → 并入 template-refactor-prd.md
- ~~push-confidence-report-prd.md~~ → 未实现，已删除
- ~~contractor-risk-detection-prd.md~~ → 未实现，已删除
- ~~industry-intelligence-prd.md~~ → 未实现，已删除

---

## 阅读指南

1. 先阅读 `PRD.md` 了解产品总览与功能索引
2. 根据需要查阅对应功能规格文档
3. 参考 `project-overview.md` 了解技术架构
4. 参考 `../PRD_AI_LOG_MONITORING_v2.md` 了解 AI 日志监控

---

**最近更新**: 2026-04-25
**文档总数**: 17 个（不含已废弃）
