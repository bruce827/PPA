---
title: "Project Brief: IoT Security Algorithm Lab"
type: project-brief
status: complete
created: "2026-05-18"
source:
  - "IoT-Algorithm-Research/iot-security-algorithm-research-notes.md"
owner: "bruce"
document_language: "zh"
---

# IoT Security Algorithm Lab 项目 Brief

## Executive Summary

IoT Security Algorithm Lab 是一个面向 IoT 安全、异常检测与早期预警场景的 Python 算法研究项目。它的第一阶段目标不是立即建设生产级平台，而是建立一套可重复运行、可比较算法、可沉淀实验结果的研究基座：从公开数据集开始，完成数据加载、特征预处理、异常检测 baseline、预警阈值评估和可视化报告。

项目的核心判断是：如果当前关注点是算法研究和方法验证，而不是工程化部署，Python + Notebook/scripts 是最合适的起步方式。首个 MVP 应优先验证“公开 IoT / 网络安全数据能否支撑可解释、可比较的异常检测实验”，而不是过早接入真实设备、实时流系统或复杂平台。

成功的第一阶段产物应当能回答三个问题：哪些异常检测算法在首个数据集上表现稳定；阈值策略如何影响误报与漏报；这条算法路线是否值得继续扩展到流式预警、时间序列预测或真实 IoT 数据。

## Problem

IoT 安全与工业传感场景里的异常检测往往面临几个现实问题：数据维度高、缺失和噪声常见、攻击或故障样本比例低、实时预警要求高，并且不同算法之间难以在同一数据处理口径下公平比较。

如果没有一个统一的算法研究基座，后续容易出现三类损耗：

- 算法实验不可复现：数据清洗、特征处理、阈值策略散落在 notebook 中，无法稳定重跑。
- 指标不可比较：不同模型使用不同切分方式、不同归一化策略、不同告警阈值，结论含糊。
- 工程化过早：还没验证算法可行性，就开始做实时平台、接口或 UI，成本过高且方向容易跑偏。

因此，当前更需要一个轻量但规范的算法实验室，而不是直接做完整产品。

## Project Goal

建立一个 Python 研究项目，用公开 IoT / 网络安全数据集跑通端到端异常检测与预警实验流程，为后续真实数据接入、在线检测、可视化预警和产品化判断提供证据。

第一阶段目标：

- 选定一个公开数据集作为首个实验基准。
- 实现标准数据加载、清洗、特征处理和训练/评估流程。
- 用 PyOD 跑通多个 baseline 模型。
- 输出模型对比指标、异常分数分布、阈值策略结果和告警可视化。
- 形成一份可复现实验报告，判断是否进入下一阶段。

## MVP Scope

MVP 建议命名为 `iot-security-algorithm-lab`，以研究项目形态启动。

MVP 包含：

- 数据集适配器：优先支持一个公开数据集，建议从 TON_IoT 或 BoT-IoT 中二选一。
- 特征预处理：字段选择、缺失值处理、类别编码、数值归一化、训练/测试切分。
- Baseline 模型：Isolation Forest、LOF、ECOD、COPOD，必要时补充 AutoEncoder。
- 评估模块：Precision、Recall、F1、ROC-AUC、PR-AUC、混淆矩阵、误报率、漏报率。
- 阈值策略：固定 contamination、分位数阈值、基于验证集调优阈值。
- 可视化报告：异常分数分布、告警时间线、模型对比表、关键结论摘要。
- 项目结构：`data/`、`notebooks/`、`src/`、`configs/`、`results/`、`README.md`。

MVP 不包含：

- 实时流式生产系统。
- Web UI 或大屏。
- 真实设备接入。
- 多租户、权限、告警通知等平台能力。
- 深度学习模型大规模调参。
- 与 PPA 主系统的业务集成。

## First Dataset Recommendation

首个数据集建议优先选择 **TON_IoT**，备选 **BoT-IoT**。

选择 TON_IoT 的理由：

- 更贴近 IoT / IIoT 安全场景，而不仅是传统网络入侵检测。
- 数据类型更丰富，便于后续扩展到传感器、系统日志或网络流量组合分析。
- 适合作为“算法研究实验室”的第一块验证地：既能跑传统 anomaly detection，也能向时序预警延展。

如果目标是快速跑通异常检测 baseline，BoT-IoT 也可以作为更直接的备选。CICIoT2023 适合后续扩展阶段再纳入，用来验证算法在更新、更大规模数据上的泛化能力。

## Technical Approach

第一阶段采用分层技术路线：

- 数据处理：pandas、numpy、scikit-learn。
- 异常检测主框架：PyOD，作为 MVP 唯一必选算法依赖。
- 时间序列预警扩展：Darts，作为预测残差和时间索引告警的后续扩展；安装包名使用 `darts`。
- 在线学习与流式检测扩展：River，作为在线检测、概念漂移和流式实验的后续扩展。
- 缺失值和复杂工业时序扩展：PyPOTS，作为真实 IoT 数据缺失值、不规则采样、多变量时序场景的后续扩展。
- 深度时序论文复现扩展：Time-Series-Library。
- 网络入侵检测参考实现：Kitsune-py。

推荐先以 PyOD 为主线，因为它能以统一 API 快速比较多种算法，最适合作为 MVP 的算法基座。项目 Python 基线建议设为 3.11+，以便后续兼容 River。River、Darts 和 PyPOTS 暂不作为 MVP 主依赖，而是按 `stream`、`timeseries`、`missing` 等可选扩展逐步引入。

## Success Criteria

MVP 完成的判定标准：

- 能在选定数据集上一键或少量命令完成数据处理、训练、评估和报告生成。
- 至少 4 个 baseline 模型完成横向对比。
- 每个模型输出 Precision、Recall、F1、ROC-AUC、PR-AUC、误报率、漏报率。
- 至少形成 2 种阈值策略对比，并说明对误报和漏报的影响。
- 输出一份 `results/` 下的实验报告，包含模型排名、关键图表和下一步建议。
- 项目 README 能让后续开发者在本地复现实验。

研究成功的初步目标不是追求单一最高分，而是得到可信结论：

- 哪类模型适合该数据集。
- 哪些特征对检测结果影响最大。
- 阈值策略是否可解释。
- 是否值得进入流式预警或真实数据接入阶段。

## Phase Plan

### Phase 0: Project Definition

整理项目目标、数据集候选、MVP 范围、指标口径和技术路线，形成 brief、PRD 和架构草案。

### Phase 1: Baseline Experiment

创建 Python 项目骨架，接入首个公开数据集，完成 PyOD baseline 对比和可视化报告。

### Phase 2: Warning Strategy

围绕异常分数和时间维度建立告警策略，比较固定阈值、动态阈值、分位数阈值和验证集调优阈值。

### Phase 3: Streaming / Time-Series Extension

引入 River 或 Darts，验证流式检测、概念漂移、预测残差预警等方向。

### Phase 4: Real Data Readiness

定义真实 IoT / 安全数据接入格式，评估缺失值、噪声、采样不均、标签不足时的处理策略。

## Risks

- 数据集下载、清洗和字段理解成本可能高于预期。
- 公开数据集与真实业务数据分布可能差异明显，研究结论不能直接等同生产效果。
- 异常检测容易出现高 AUC 但高误报，必须同时关注 PR-AUC、误报率和阈值策略。
- 若过早引入深度学习，可能导致项目复杂度上升但结论不稳定。
- 缺少真实告警场景定义时，“提前量”和“业务可用性”难以准确评估。

## Recommended Next Step

下一步建议进入 PRD 创建，而不是直接开发。PRD 需要明确：

- 首个数据集到底选 TON_IoT 还是 BoT-IoT。
- MVP 的命令行入口、目录结构和报告格式。
- 数据下载方式是否自动化。
- 指标口径和最低完成标准。
- Phase 1 是否只做 batch anomaly detection，还是必须包含简单告警时间线。

推荐运行：

```text
bmad-create-prd
```

并把本 brief 与原始研究笔记作为输入。
