# 评分因子阈值调整 Bugfix 记录（0.8 → 0.7 一致化改造）

## 背景与问题

- 功能入口：`新建项目评估 / 风险评分`，以及后端 `/api/calculate` 项目成本计算。
- 评分因子用于放大/缩小各类成本（软件开发、系统对接、差旅、运维、风险成本），最终报价均会乘以该因子。
- 前端和后端各自维护了一套“评分因子分段映射”的常量：
  - 前端：`frontend/ppa_frontend/src/utils/rating.ts`
  - 后端：`server/utils/constants.js` + `server/utils/rating.js`

在之前一次仅改前端的调整之后，出现了**前端展示用评分因子阈值**和**后端参与实际报价的评分因子阈值**不一致的问题。

## 原始逻辑（问题版本）

- 分段阈值（前后端原始设定）：
  - 基准区间起点：`baseThresholdRatio = 0.8`
  - 中位区间终点：`midThresholdRatio = 1.0`
  - 峰值区间终点：`peakThresholdRatio = 1.2`
  - 中位系数：`midFactor = 1.2`
  - 封顶系数：`factorCap = 1.5`
- 换算为规则：
  - 风险占比 ≤ 80% → 因子 1.0（基准价）
  - 80% ~ 100% → 因子 1.0 ~ 1.2 线性上浮
  - 100% ~ 120% → 因子 1.2 ~ 1.5 线性上浮
  - >120% → 因子封顶 1.5

之后前端曾将起始阈值改为 0.7，但后端仍停留在 0.8，导致：

- 前端 UI 中展示的 `riskScoreSummary.factor` 基于 0.7 逻辑；
- 后端 `/api/calculate` 返回的 `rating_factor` 仍基于 0.8 逻辑。

## 修复目标

统一前后端评分因子的计算逻辑，将“基准价区间”阈值从 **0.8 调整为 0.7**，其它分段规则不变，并在文档 / 说明中同步反映。

## 具体改动

### 1. 后端改动

文件：`server/utils/constants.js`

- 原常量：

```js
const RISK = {
  DEFAULT_MAX_SCORE: 100,
  BASE_THRESHOLD_RATIO: 0.8,
  MID_THRESHOLD_RATIO: 1.0,
  PEAK_THRESHOLD_RATIO: 1.2,
  MID_FACTOR: 1.2,
  FACTOR_CAP: 1.5,
  LEVEL_THRESHOLDS: {
    LOW: 0.4,
    HIGH: 0.7
  }
};
```

- 修改后：

```js
const RISK = {
  DEFAULT_MAX_SCORE: 100,
  BASE_THRESHOLD_RATIO: 0.7,
  MID_THRESHOLD_RATIO: 1.0,
  PEAK_THRESHOLD_RATIO: 1.2,
  MID_FACTOR: 1.2,
  FACTOR_CAP: 1.5,
  LEVEL_THRESHOLDS: {
    LOW: 0.4,
    HIGH: 0.7
  }
};
```

文件：`server/utils/rating.js`

- 函数 `computeFactorFromRatio(ratio)` 逻辑不变，但会自动使用新的常量：
  - 风险占比 ≤ 70% → 系数 1.0；
  - 70% ~ 100% → 系数 1.0–1.2 线性上浮；
  - 100% ~ 120% → 系数 1.2–1.5 线性上浮，>120% 时封顶 1.5。

文件：`server/services/calculationService.js`

- 使用 `computeRatingFactor(riskScore)` 获取：
  - `factor` → `rating_factor`
  - `ratio` → `rating_ratio`
  - `maxScore` → `risk_max_score`
- 所有成本项（软件研发、系统对接、差旅、运维、风险成本）最终都会乘以新的 `rating_factor`。

### 2. 前端改动（保持与后端一致）

文件：`frontend/ppa_frontend/src/utils/rating.ts`

- 将 `RISK.baseThresholdRatio` 从 `0.8` 调整为 `0.7`，其余保持不变，从而使：
  - `summarizeRisk()` 中返回的 `normalizedFactor` 与后端逻辑一致。

文件：`frontend/ppa_frontend/src/pages/Assessment/New.tsx`

- “评分因子参与计算说明”抽屉中的文案从：
  - “风险占比 ≤ 80% → 系数 1.00（基准价）”
  - “80% < 风险占比 ≤ 100% → 系数 1.00~1.20 之间线性上浮”
- 调整为：
  - “风险占比 ≤ 70% → 系数 1.00（基准价）”
  - “70% < 风险占比 ≤ 100% → 系数 1.00~1.20 之间线性上浮”

文件：`frontend/ppa_frontend/WARP.md`

- 文档中的说明从“≤80% 系数 1.0，>120% 封顶 1.5”调整为“≤70% 系数 1.0，>120% 封顶 1.5”。

## 影响范围

- 接口：`POST /api/calculate`
  - 字段 `rating_factor` 与前端展示用评分因子完全一致；
  - 所有乘以 `rating_factor` 的成本项（软件研发、系统对接、差旅、运维、风险成本）报价随之略有调整：
    - 对于风险占比较 70%–80% 区间的项目，现在会比旧逻辑略“更贵”（以前是基准价，现在进入上浮区间）。
- 前端页面：
  - “新建评估 / 风险评分”顶部统计卡片中的评分因子；
  - “评分因子参与计算说明”抽屉描述；
  - “生成总览 / 计算最新报价”看到的最终报价。

## 回归与校验建议

1. 固定一套风险配置和评分，构造以下占比场景（假设 maxScore=100）：
   - totalScore = 60（占比 0.6）
   - totalScore = 75（占比 0.75）
   - totalScore = 100（占比 1.0）
   - totalScore = 120（占比 1.2）
2. 前端校验：
   - 在风险评分页查看“评分因子”展示值；
3. 后端校验：
   - 调用 `/api/calculate`，比对返回的 `rating_factor` 是否与前端一致；
4. 特别关注边界：
   - 占比恰好为 0.7 / 1.0 / 1.2 时，系数是否符合预期；
   - 占比大于 1.2 时，系数是否封顶为 1.5。

