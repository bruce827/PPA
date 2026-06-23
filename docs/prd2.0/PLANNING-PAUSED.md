# PPA 2.0 规划暂停备注

> 本文件记录 PPA 2.0 规划的暂停状态，方便以后快速恢复上下文。

---

## 暂停时间
2026-05-05

## BMad 工作流状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 1-analysis | ✅ 完成 | 头脑风暴已完成 |
| 2-planning | ✅ 完成 | PRD 2.0 已完成 |
| 3-solutioning | 🔄 进行中 | Architecture 文档进行到 step 2（共若干步） |
| 4-implementation | ⏳ 未开始 | 尚未启动 |

**Architecture 进度**：
- 文档位置：`_bmad-output/planning-artifacts/architecture.md`
- `stepsCompleted: [1, 2]`，`lastStep: 2`，`status: 'in_progress'`
- 第 1 步（Foundation）和第 2 步（Context Analysis）已完成

## 核心规划内容回顾

### PPA 2.0 定位
群体评估平台：从 1.0 的单人评估工具 → 多人群测 + 聚合结果 + 付费报告

### 三大验证目标
1. 是否有足够专业用户愿意参与公开项目评估
2. 群体评估结果能否形成有价值的决策参考
3. 是否有人愿意付费买报告和筛选服务

### 六大能力模块
1. 公开项目池（招标网站抓取）
2. 多人简化评估表单
3. 聚合结果 + 分歧度/可信度展示
4. 用户积分/声望/排行榜/奖励兑换（AI token）
5. 可收费报告（单项目 + 连续筛选服务）
6. 运营后台

### 硬约束
- 年运维成本 ≤ 2000 元
- 必须复用 1.0 现有资产
- 首批项目池仅限软件开发/信息化/数字化建设类招标

### 目标用户
- **供给侧**：项目经理、架构师、开发负责人（参与评估，换 AI token）
- **付费侧**：中小软件公司老板、外包团队负责人、投标负责人

## 下一步建议

1. **继续 Architecture**：运行 `bmad-create-architecture` 完成剩余步骤
2. **直接进入实施**：运行 `bmad-sprint-planning` 启动实施规划
3. **快速开发某个模块**：运行 `bmad-quick-dev`

## 相关文档

| 文档 | 用途 |
|------|------|
| `docs/prd2.0/prd.md` | 产品需求文档 |
| `docs/prd2.0/product-brief.md` | 产品简报 |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture 工作流文档 |
| `docs/prd2.0/business-model.md` | 商业模式 |
| `docs/prd2.0/reward-and-judgment-mechanism.md` | 奖励与判断机制 |
| `docs/prd2.0/pricing-and-reward-experiments.md` | 定价与奖励实验 |

## 如何恢复

在 Claude Code 中输入：
```
继续 PPA 2.0 规划
```

或者运行 BMad 技能：
```
/bmad-create-architecture   # 继续 Architecture
/bmad-sprint-planning       # 进入实施规划
```

---

**长期记忆**：`~/.claude/projects/-Users-maylis-Desktop-github------------PPA/memory/ppa20-planning-paused.md`
