# Infographic Requirement Guide - 测试脚本（v2.4）

**版本**: v2.4  
**用途**: 回归双模式流程 + B 系列菜单 + TG

---

## 1. 重置状态（保留产物）

```bash
cd .skills/infographic-requirement-guide
cat > workflow-state.json <<'JSON'
{
  "draft_id": "draft-20260304-000000",
  "workflow_mode": null,
  "current_step": "FR",
  "completed_steps": [],
  "artifacts": {
    "brief": null,
    "data_profile": null,
    "intent_analysis": null,
    "chart_decision": null,
    "table_brief": null,
    "table_decision": null,
    "table_checklist": null,
    "table_preview": null,
    "chart_prompt": null,
    "speech_script": null
  },
  "created_at": null,
  "updated_at": null
}
JSON
```

---

## 2. 核心用例

### 用例 A：意图驱动完整流程

1. `FR` 选择 `workflow_mode=intent-guided`
2. `DT`
3. `IA`
4. `DL`
5. `TG`（可选，建议执行）
6. `NC`
7. `ANF`（可选）

验证点：
- `chart-decision` 中 `selection_mode=intent-guided`
- `completed_steps` 顺序正确
- 若执行 `TG`：`table_brief` 必含 `source_carrier/calculation_owner`
- 若执行 `TG`：`table_decision` 必含 `chart_table_boundary`

### 用例 B：数据驱动简流程

1. `FR` 选择 `workflow_mode=data-guided`
2. `DT`
3. 执行三个一级菜单并分别验证：
   - `[EDA]` 分析现有数据（规则选型）
   - `[DVZ]` 打开 `https://data-to-viz.vercel.app/` 并回填主图选择
   - `[MIX]` 多种展示方案组合
4. `TG`（可选，建议执行）
5. `NC`
6. `ANF`（可选）

验证点：
- 可不执行 `IA/DL` 直接完成 `NC`
- `chart-decision` 中 `selection_mode=data-guided`
- `chart-decision` 中 `selection_entry=website|combo|rules`
- 若执行 `TG`：`table_brief` 为必产物，不可为空
- 若 `presentation_strategy=dual-view`：`table-preview` 必须含 pitch/table 细分 URL

### 用例 C：失效传播

1. 在完成 `NC` 后重跑 `DT`
2. 预期：`IA/DL/EDA/DVZ/MIX/TG/NC/ANF` 从 `completed_steps` 中移除，相关 artifacts 置空

---

## 3. 快速检查

```bash
cat .skills/infographic-requirement-guide/workflow-state.json
ls -la .skills/infographic-requirement-guide/outputs/
```

---

## 4. 空白对照测试（A/B）

若要比较“安装 skill”和“未安装 skill”的差异，使用仓库脚本：

```bash
npm run setup-skill-ab-test -- --output /tmp/infographic-skill-ab-test
```

生成后查看：
- `scripts/setup-skill-ab-test.md`
- `/tmp/infographic-skill-ab-test/README.md`
- `/tmp/infographic-skill-ab-test/scorecard.md`
