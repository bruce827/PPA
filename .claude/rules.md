# 项目特定规则

## 路径空格处理 ⚠️

**重要**：项目目录路径包含空格：
```
/Users/maylis/Desktop/github上的项目/项目评估系统/PPA
```

### 规则

1. **不要使用带空格的路径**：始终使用相对路径或当前工作目录
2. **当前工作目录已是正确路径**：`/Users/maylis/Desktop/github上的项目/项目评估系统/PPA`（无空格）
3. **错误示例**：
   - ❌ `/Users/maylis/Desktop/github 上的项目/...`（有空格）
   - ✅ `/Users/maylis/Desktop/github上的项目/...`（无空格）
   - ✅ `.claude/skills/...`（相对路径，推荐）

### 原因

- `github上的项目` 中间**没有空格**
- 转义错误会导致访问 `.claude/skills/` 和 `./claude/skills/` 两个不同目录
- Bash 命令中使用路径时必须用单引号或正确转义

### 正确做法

```bash
# ✅ 正确 - 使用相对路径
ls .claude/skills/

# ✅ 正确 - 使用完整无空格路径
ls '/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/.claude/skills/'

# ❌ 错误 - 添加了不存在的空格
ls '/Users/maylis/Desktop/github 上的项目/...'
```

---

## 技能开发规范

- 技能文件统一放在 `.claude/skills/` 目录
- 修改技能时，同时更新 `.claude/skills/` 目录（不是 `.codex/skills/`）
