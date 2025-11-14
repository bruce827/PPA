# AI 模型调用日志（文件落盘）说明

> 适用范围：server/（后端）  
> 覆盖步骤：第一步 风险评分（含名称归一）与第二步 模块梳理  
> 存储形式：仅文件，无数据库

## 1. 目标与作用
- 为风险评分与模块梳理的每次 AI 调用保留完整“请求/响应/解析”快照，便于后续复盘、对比与回放测试。
- 落盘不影响接口返回；写盘失败仅打印告警日志。

## 2. 启用与目录
- 默认启用，无需配置。
- 可选环境变量（启动 server 时传入）：
  - `AI_LOG_ENABLED`：默认开启。设置为 `false` 可关闭写盘。
  - `AI_LOG_DIR`：日志根目录，默认 `server/logs/ai`。

目录结构（示例）：
```
server/logs/ai/
  modules/2025-11-14/081703_dc9c...27ec/
    index.json
    request.json
    response.raw.txt
    response.parsed.json
    notes.log
  risk/2025-11-14/081900_b12a...83da/
    ...
  risk-normalize/2025-11-14/082015_7f2e...aa10/
    ...
  workload/2025-11-15/093012_abcd...ef12/
    index.json
    request.json
    response.raw.txt
    response.parsed.json
    notes.log
```

生成规则：`{step}/YYYY-MM-DD/{HHmmss}_{requestHash}/`
- `step`：`risk` / `risk-normalize` / `modules` / `workload`
- `requestHash`：服务内生成的唯一请求哈希（前缀展示）

## 3. 文件说明
- `index.json`：摘要信息（step/route/model/status/耗时/超时/计数）
- `request.json`：请求快照（模板全文、variables、document/description、最终拼装后的 prompt）
- `response.raw.txt`：模型原始返回文本（完整）
- `response.parsed.json`：解析后的标准结构（risk_scores… 或 project_analysis+modules…）
- `notes.log`：关键日志行的简要汇总（provider/model/计时/计数或错误）

成功写盘后，控制台会输出：
```
[AI File Logger] saved to: server/logs/ai/<step>/<date>/<time>_<hash>
```
写盘失败会输出：
```
[AI File Logger] write failed: <error>
```

## 4. 接入覆盖点
- 风险评分：`/api/ai/assess-risk`（成功/失败）
- 名称归一：`/api/ai/normalize-risk-names`（成功/失败）
- 模块梳理：`/api/ai/analyze-project-modules`（成功/失败）
- 工作量评估：`/api/ai/evaluate-workload`（成功/失败）

## 5. 常见问题
- 看不到 `server/logs/ai`：
  - 确认后端已重启（加载最新写盘逻辑）。
  - 查看控制台是否出现 `[AI File Logger] saved to:` 提示。
  - 若自定义目录，检查 `AI_LOG_DIR` 指向位置。
  - 确认未将 `AI_LOG_ENABLED=false`。

## 6. 清理建议
- 小型单人项目可暂不做清理。
- 若空间需要，可定期手动删除某天目录或后续添加简单清理脚本（按日期删除）。
