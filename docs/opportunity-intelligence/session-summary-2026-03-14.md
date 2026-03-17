# 项目机会智能评估服务会话总结

## 会话日期

- `2026-03-14`

## 会话目标

围绕“基于现有 PPA 项目数据和外部招标公告数据，构建项目招标文件自动筛选与推荐能力”进行需求收敛、方案确认、文档沉淀与实现前技术规格整理。

## 本次已确认的核心结论

### 1. 最终产物不是单一模型，而是一个服务

本次达成一致：要实现的不是“训练一个独立模型”，而是一个可被当前 PPA 内部调用、也可供未来外部系统调用的：

- 项目机会智能评估服务

该服务负责：

1. 接收全网招标机会输入
2. 解析正文、PDF、图片、附件
3. 标准化为统一机会快照
4. 匹配历史项目与业绩库
5. 规则评分与排序
6. 输出推荐理由与不推荐原因

### 2. AI 的职责边界已经明确

AI 负责：

- 文档理解
- 图文识别
- 字段抽取
- 标签生成与归一
- 风险信号和能力信号提取
- Top N 候选结果的解释增强

AI 不负责：

- 最终推荐主评分
- 最终排序主链
- 最终适配裁决

### 3. 第一阶段不做复杂模型训练

本次明确决定：

- 第一阶段不从零训练基础模型
- 第一阶段不做学习排序
- 第一阶段不做正式向量库落地

第一阶段采用：

- Headless 智能分析服务
- 结构化输出
- 历史项目/业绩检索
- 规则评分器 v1

### 4. 数据表达方式已经收敛

最终业务真相必须是结构化结果。

同时保留两类数据：

- 结构化数据：作为权威输出和评分输入
- 向量化数据：作为未来检索增强能力

本次确认：

- 结构化是主存
- 向量化是辅存

### 5. 推荐主链的最终裁决逻辑

推荐结果必须由代码控制的规则评分器完成。

第一阶段评分逻辑围绕以下维度：

- 行业匹配度
- 能力匹配度
- 项目形态匹配度
- 历史项目相似度
- 业绩命中度
- 风险惩罚
- 时间惩罚

## 对现有仓库的关键调研结论

本次已经基于当前仓库真实代码与数据库确认：

1. PPA 已存在历史项目评估能力、标签字段、CSV 业绩库和相关推荐能力。
2. `projects.tags_json` 已真实落库，不是概念设计。
3. 当前系统已有：
   - 项目详情页推荐
   - CSV 业绩库页面
   - 项目标签 AI 生成接口
4. 当前数据库中已有标准项目、Web3D 项目、招标网站数据和 AI 提示词。
5. 当前仓库没有现成 Python 服务骨架，适合新增独立服务目录。

## 本次新增并保存的文档

已创建文档包目录：

- `docs/opportunity-intelligence/`

已生成文档：

1. `README.md`
   - 文档包说明与统一结论
2. `requirements-summary.md`
   - 需求总结与范围收敛
3. `prd.md`
   - 第一阶段 PRD
4. `architecture.md`
   - 第一阶段技术架构
5. `implementation-plan.md`
   - 分阶段实施路线
6. `tech-spec-opportunity-intelligence-mvp-service.md`
   - 面向开发的 MVP quick spec

## Quick Spec 本次已补强的内容

在 adversarial review 后，已将 quick spec 从“方向正确”补强为更接近可开发状态，重点包括：

1. 明确 API contract
2. 明确 `schema_version`
3. 将健康检查统一为 `GET /health`
4. 补充 SQLite 只读访问策略
5. 补充历史特征 fallback 规则
6. 补充 CSV 行为一致性约束
7. 将 provider 输入统一为 `DocumentInputEnvelope`
8. 写死评分权重与等级阈值
9. 增加脱敏和裁剪规则
10. 增加 Node 配置文件约束
11. 增加 contract fixture 与 parity test 要求
12. 增加本地联调命令和端口约定

## 当前冻结的 MVP 服务范围

MVP 只要求打通以下闭环：

1. Python FastAPI 服务骨架
2. `GET /health`
3. `POST /api/v1/analyze`
4. `POST /api/v1/recommend`
5. `POST /api/v1/analyze-and-recommend`
6. 历史项目读取
7. CSV 业绩库读取
8. 规则评分器 v1
9. Node 网关代理接入
10. Python 与 Node 两侧测试

## 当前推荐的服务目录方向

建议新增：

- `services/opportunity_intelligence/`

Python 服务职责：

- 智能分析
- 标准化
- 检索
- 评分
- 解释

Node 服务职责：

- 网关代理
- 与现有 PPA 集成

## 推荐的下一步

你决定“之后再实现”，因此当前最合理的后续动作是：

1. 以后直接以 `tech-spec-opportunity-intelligence-mvp-service.md` 为开发基线
2. 开发时先搭服务骨架，不先接真实模型
3. 先用 mock provider 打通 analyze / recommend / analyze-and-recommend
4. 再逐步接入真实 Gemini / Claude / OpenAI provider

## 当前会话结束状态

本次会话已完成：

- 需求收敛
- PRD 沉淀
- 技术架构沉淀
- 实施路线整理
- Quick spec 生成
- Adversarial review 与 spec 修正

尚未开始：

- 代码实现
- 服务骨架搭建
- 测试执行
- 联调验证

## 备注

本文件用于后续恢复上下文和继续实施时快速回看。后续若开始开发，应优先阅读：

1. `docs/opportunity-intelligence/requirements-summary.md`
2. `docs/opportunity-intelligence/prd.md`
3. `docs/opportunity-intelligence/architecture.md`
4. `docs/opportunity-intelligence/tech-spec-opportunity-intelligence-mvp-service.md`
