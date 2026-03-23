# 项目特定规则

## 当前项目目录 ⚠️

**重要**：当前工作目录是：
```
/Users/maylis/Desktop/github上的项目/项目评估系统/PPA
```

### 路径规则

1. **路径中无空格**：`github上的项目` 中间**没有空格**
2. **使用相对路径**：推荐使用 `.claude/skills/` 而非绝对路径
3. **Bash 命令路径处理**：
   - ✅ `.claude/skills/infographic-requirement-guide/`
   - ✅ `'./outputs/'`
   - ❌ `/Users/maylis/Desktop/github 上的项目/...`（错误添加空格）

---

## Skill 执行规则

### 文件路径约定
- 状态文件：`./workflow-state.json`
- 产物目录：`./outputs/`
- 参考文件：`./references/`
- 模板文件：`./template/`

### 数据库路径
- 项目数据库：`./server/ppa.db`

---

## 执行前检查清单

每次执行 Skill 步骤前，必须：
1. 确认当前工作目录正确（无空格路径）
2. 读取 `./workflow-state.json` 了解当前状态
3. 读取对应的 `./references/*.md` 了解执行规范
4. 产物一律写入 `./outputs/` 目录
