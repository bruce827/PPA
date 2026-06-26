# Project Test Workspace

这个目录作为项目级测试入口，用于集中存放测试计划、复测脚本、测试报告和测试产物。

## 目录约定

- `tests/<topic>/plan.md`：本次测试或修复计划。
- `tests/<topic>/scripts/`：可重复执行的测试、验证或采样脚本。
- `tests/<topic>/reports/`：人工可读的测试报告、基线报告和复测结论。
- `tests/<topic>/artifacts/`：机器生成的 JSON、原始采样结果或较大的测试产物。

## 与现有测试目录的关系

- `server/tests/` 仍是后端 Jest 自动化测试的执行目录。
- `frontend/*/tests/` 仍是前端测试执行目录。
- `_bmad-output/test-artifacts/` 是历史自动化产物目录。
- 新增测试专题应优先在 `tests/` 下建立专题目录，把计划、脚本、报告和产物集中归档。

如果某些测试文件必须放在框架默认目录中执行，例如 Jest 的 `server/tests/*.test.js`，则在 `tests/<topic>/README.md` 中列出源文件路径，并在 `tests/<topic>/scripts/` 提供统一复测入口。
