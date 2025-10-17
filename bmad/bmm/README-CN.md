# BMM - BMad 方法模块

BMM（BMad 方法模块）是 BMad 方法 v6a 的核心编排系统，通过专用的代理、工作流、团队和任务提供全面的软件开发生命周期管理。

## 📚 必读内容

**在使用 BMM 之前，您必须阅读 [BMM v6 工作流指南](./workflows/README-CN.md)。** 该文档解释了革命性的 v6a 工作流系统以及所有组件如何协同工作。

## 模块结构

### 🤖 `/agents`

为不同开发角色设计的专用 AI 代理：

- **PM**（产品经理）- 产品规划和需求管理
- **Analyst**（分析师）- 业务分析和研究
- **Architect**（架构师）- 技术架构和设计
- **SM**（Scrum Master）- Sprint 和故事管理
- **DEV**（开发者）- 代码实现
- **SR**（高级审查员）- 代码审查和质量保证
- **UX** - 用户体验设计
- 以及更多专用角色

### 📋 `/workflows`

BMM 的核心 - 为四个开发阶段设计的结构化工作流：

1. **分析阶段**（可选）
   - `brainstorm-project` - 项目构思
   - `research` - 市场/技术研究
   - `product-brief` - 产品策略

2. **规划阶段**（必需）
   - `plan-project` - 规模自适应项目规划
   - 根据项目复杂性路由到适当的文档

3. **解决方案设计阶段**（适用于 Level 3-4 项目）
   - `3-solutioning` - 架构设计
   - `tech-spec` - Epic 特定的技术规范

4. **实施阶段**（迭代）
   - `create-story` - 故事生成
   - `story-context` - 专业知识注入
   - `dev-story` - 实现
   - `review-story` - 质量验证
   - `correct-course` - 问题解决
   - `retrospective` - 持续改进

### 👥 `/teams`

为不同项目类型和阶段预配置的代理团队。这些团队协调多个代理共同完成复杂任务。

### 📝 `/tasks`

可复用的任务定义，代理在工作流中执行。这些是组成更大工作流的基本工作单元。

### 🔧 `/sub-modules`

扩展模块，为 BMM 添加专用功能。

### 🏗️ `/testarch`

测试架构和质量保证组件。

## 快速开始

```bash
# 运行规划工作流
bmad pm plan-project

# 创建新故事
bmad sm create-story

# 运行开发工作流
bmad dev develop

# 审查实现
bmad sr review-story
```

## 关键概念

### 规模级别

BMM 会根据项目复杂性自动调整：

- **Level 0**：单一原子变更
- **Level 1**：1-10 个故事，最少文档
- **Level 2**：5-15 个故事，聚焦 PRD
- **Level 3**：12-40 个故事，完整架构
- **Level 4**：40+ 个故事，企业级规模

### 即时设计（Just-In-Time Design）

技术规范在实施过程中按每个 epic 创建，而非一次性完成，从而允许学习和适应。

### 上下文注入（Context Injection）

动态生成故事特定的技术指导，为开发者提供每项任务所需的专业知识。

## 与 BMad Core 的集成

BMM 无缝集成到 BMad Core 框架中，利用以下功能：

- 代理执行引擎
- 工作流编排
- 任务管理
- 团队协调

## 相关文档

- [BMM 工作流指南](./workflows/README-CN.md) - **从这里开始！**
- [代理文档](./agents/README-CN.md) - 各代理的能力
- [团队配置](./teams/README-CN.md) - 预构建的团队设置
- [任务库](./tasks/README-CN.md) - 可复用的任务组件

## 最佳实践

1. **始终从工作流开始** - 让工作流指导您的流程
2. **尊重规模** - 不要为小项目过度文档化
3. **拥抱迭代** - 使用回顾持续改进
4. **信任流程** - v6a 方法论经过精心设计

---

有关完整 BMad 方法 v6a 工作流系统的详细信息，请参阅 [BMM 工作流 README](./workflows/README-CN.md)。