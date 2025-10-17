---
last-redoc-date: 2025-09-28
---

<!-- Powered by BMAD-CORE™ -->

# 创意智能系统（Creative Intelligence System, CIS）

**目的（Purpose）**：通过 AI 驱动的引导，在五大专门领域革新创意与战略思维。CIS 模块为头脑风暴、设计思维、问题解决、创新战略与故事叙事提供专家级引导与教练支持。

**概述（Overview）**：Creative Intelligence System 通过具有鲜明人格的专用代理（agent personas），为团队与个人提供结构化的创意方法。每个代理主持交互式工作流，使用经过验证的技术，结合上下文、精力状态与目标进行自适应引导。不同于传统“代做型”创意工具，CIS 代理更像资深引导师——通过高质量提问激发洞见，而不是直接给出答案。

## 工作流（Workflows）

[查看全部工作流 →](./workflows/README.md)

该模块包含 **5 个交互式工作流**，内置 150+ 创意技术与框架：

- **Brainstorming（头脑风暴）** - 7 大类别共 36 种创意激发技术
- **Design Thinking（设计思维）** - 完整 5 阶段以人为中心的设计流程
- **Problem Solving（问题解决）** - 系统化根因分析与解决方案生成
- **Innovation Strategy（创新战略）** - 商业模式创新与颠覆性分析
- **Storytelling（故事叙事）** - 25 种叙事框架打造有说服力的内容

## 代理（Agents）

[查看全部代理 →](./agents/README.md)

五个具有独特人格与沟通风格的专用代理：

- **Carson** - 顶尖头脑风暴专家（充满能量的引导者）
- **Maya** - 设计思维大师（即兴 Jazz 风格的引导）
- **Dr. Quinn** - 问题解决大师（侦探 + 科学家混合型思维）
- **Victor** - 颠覆式创新智者（大胆且精确的战略性表达）
- **Sophia** - 叙事大师（优雅而富感染力的讲述者）

## 配置（Configuration）

该模块使用 `/bmad/cis/config.yaml` 配置：

- `output_folder` - 工作流输出保存位置
- `user_name` - 会话参与者身份标识
- `communication_language` - 引导交互使用语言

## 使用（Usage）

```bash
# 直接调用工作流
workflow brainstorming
workflow design-thinking --data /path/to/context.md

# 通过代理发起会话
agent cis/brainstorming-coach
> *brainstorm
```

## 关键差异化（Key Differentiators）

- **引导而非代替（Facilitation Over Generation）**：代理通过战略性提问帮助用户生成自身洞见
- **能量感知（Energy-Aware Sessions）**：内置检查点动态监测并调节用户参与度
- **上下文整合（Context Integration）**：所有工作流可接收可选上下文文档以实现领域化引导
- **人格化体验（Persona-Driven Experience）**：每个代理具备与其专长自然匹配的沟通风格
- **丰富方法库（Rich Method Libraries）**：跨创意学科的 150+ 经验证技术与框架

## 安装（Installation）

CIS 模块安装器（`_module-installer/`）会配置完整的创意智能套件：包括所有代理、工作流与技术库。

## 模块结构（Module Architecture）

```text
cis/
├── agents/          # 5 个专用创意代理
├── workflows/       # 5 个交互式工作流
│   ├── brainstorming/
│   ├── design-thinking/
│   ├── innovation-strategy/
│   ├── problem-solving/
│   └── storytelling/
├── tasks/           # 支撑型任务操作
└── teams/           # 代理团队配置
```

---

此模块属于 BMAD Method v6.0 —— 通过专家级 AI 引导释放创意潜能。
