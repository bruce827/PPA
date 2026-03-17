# 项目机会智能评估服务技术架构

## 1. 架构目标

第一阶段技术架构需要满足以下目标：

1. 能快速接入现有 PPA
2. 能独立部署为服务
3. 能调用外部 AI 能力做文档理解
4. 能沉淀自有结构化特征与评分逻辑
5. 能为后续向量检索、反馈学习与外部开放接口留扩展点

## 2. 核心架构结论

### 2.1 架构模式

采用“独立服务 + 模型编排 + 检索匹配 + 规则评分”的分层架构。

### 2.2 最重要的边界

1. 模型层负责理解和归一
2. 检索层负责找证据
3. 评分层负责最终裁决
4. 输出层负责结构化服务结果

## 3. 推荐技术栈

### 3.1 现有系统保持不变

- 前端：UmiJS + React + Ant Design
- 后端：Node.js + Express
- 数据库：SQLite

### 3.2 新服务建议

- 服务框架：Python + FastAPI
- 数据处理：Pydantic + Polars/Pandas
- 向量检索：FAISS（MVP）
- 后续可演进：PostgreSQL + pgvector

### 3.3 模型能力接入

- 文档理解：Gemini / Claude / OpenAI 等可替换 provider
- OCR/图文识别：由 provider adapter 统一封装
- Embedding：本地或托管 provider 可替换
- 重排模型：后续作为增强能力接入

## 4. 服务分层

### 4.1 Ingestion Layer

职责：

- 接收爬虫系统传入的招标机会数据
- 挂接正文、附件、来源站点元数据

输出：

- `opportunity_raw`

### 4.2 Document Intelligence Layer

职责：

- 调用 AI / OCR / 多模态模型解析正文、PDF、图片、扫描件
- 提取关键字段和摘要

输出：

- `document_facts`
- `document_summary`
- `extraction_log`

### 4.3 Normalization Layer

职责：

- 将多模型、多来源的输出统一为标准机会快照
- 做字段归一、单位清洗、时间归一、文本裁剪

输出：

- `opportunity_snapshot`

### 4.4 Feature Layer

职责：

- 生成标签
- 提取业务域、行业、技术、风险、交付、预算等结构化特征
- 生成 embedding

输出：

- `opportunity_features`
- `opportunity_embedding`

### 4.5 Retrieval Layer

职责：

- 从历史项目库中召回相似案例
- 从合同/业绩库中召回相似条目

输出：

- `matched_projects`
- `matched_contracts`

### 4.6 Recommendation Layer

职责：

- 基于规则计算适配度、风险、优先级
- 融合检索结果与结构化特征
- 输出最终分数、等级与证据

输出：

- `recommendation_result`

### 4.7 Explanation Layer

职责：

- 将推荐原因和不推荐原因标准化
- 生成人工可读解释

输出：

- `explanation`

## 5. 数据流

```text
Crawler Output
  -> Opportunity API Ingestion
  -> Document Intelligence
  -> Opportunity Normalizer
  -> Feature Generator
  -> Internal Retrieval
  -> Rule-based Scoring
  -> Explanation Builder
  -> Structured Recommendation Response
```

## 6. 核心数据对象

### 6.1 opportunity_raw

原始招标输入对象，保存：

- 来源站点
- 标题
- 正文
- 公告链接
- 发布时间
- 附件列表

### 6.2 opportunity_snapshot

标准化快照，建议包含：

- `basic_info`
- `buyer_info`
- `industry_signals`
- `technology_signals`
- `delivery_signals`
- `budget_signals`
- `time_signals`
- `risk_signals`

### 6.3 opportunity_features

结构化特征集合，建议包含：

- tags
- capability_signals
- risk_signals
- scope_signals
- budget_level
- timeline_pressure
- project_shape

### 6.4 recommendation_result

最终输出对象建议包含：

- `fit_score`
- `fit_level`
- `risk_penalty`
- `matched_projects`
- `matched_contracts`
- `reason_codes`
- `recommended_actions`

## 7. 存储设计

### 7.1 结构化存储

第一阶段建议保存：

- 原始请求快照
- 结构化解析结果
- 特征结果
- 评分结果
- 调用日志

### 7.2 向量存储

第一阶段建议采用本地向量索引：

- 历史项目向量
- 业绩条目向量
- 招标机会向量

### 7.3 现有数据复用

第一阶段重点复用现有 PPA 资产：

- `projects`
- `assessment_details_json`
- `tags_json`
- `server/contracts/*.csv`
- 现有 AI provider 封装思路

## 8. API 设计建议

### 8.1 对内主接口

- `POST /api/opportunity-intelligence/analyze`
  - 输入原始机会
  - 输出标准化分析结果

- `POST /api/opportunity-intelligence/recommend`
  - 输入机会快照
  - 输出评分、排序与解释

- `POST /api/opportunity-intelligence/batch`
  - 批量处理每日新增机会

- `GET /api/opportunity-intelligence/:id`
  - 查询历史分析结果

### 8.2 内部模块接口

- `POST /document-intelligence/parse`
- `POST /features/generate`
- `POST /retrieval/search`
- `POST /scoring/evaluate`

MVP 可先作为单服务内部函数调用，不必过早拆成微服务。

## 9. Provider 抽象

为了避免绑定单一模型厂商，建议统一抽象 provider 适配层。

接口能力至少包括：

- `parse_document`
- `parse_image`
- `extract_fields`
- `generate_tags`
- `generate_embedding`
- `rerank_candidates`

这样后续才能灵活接：

- Gemini
- Claude
- OpenAI
- 本地 Ollama / sentence-transformers

## 10. 推荐评分设计原则

### 10.1 第一阶段评分公式

建议第一阶段使用可解释的权重评分：

```text
fit_score =
  industry_match_score +
  capability_match_score +
  project_shape_score +
  historical_similarity_score +
  contract_hit_score -
  risk_penalty -
  timeline_penalty
```

### 10.2 第一阶段不做的事情

- 不做端到端黑盒模型裁决
- 不做复杂在线学习排序
- 不做大规模微调训练

## 11. 集成策略

### 11.1 与 PPA 的关系

第一阶段不大改 PPA 主体，只新增调用链：

1. PPA 后端作为调用方
2. 新服务作为分析与推荐引擎
3. PPA 前端作为结果展示方

### 11.2 外部能力复用

未来若做独立系统，可复用同一服务接口。

## 12. 风险与技术决策

### ADR-01

采用独立服务，而不是把全部能力塞进现有 Express 服务。

原因：

- 模型编排与数据处理更适合 Python 生态
- 有利于后续向量、重排、批处理扩展

### ADR-02

最终权威输出必须为结构化结果，而不是 prompt 文本。

### ADR-03

RAG 与向量检索只做证据召回，不做最终裁决。

### ADR-04

MVP 阶段允许托管模型优先，本地化推理后续再逐步推进。
