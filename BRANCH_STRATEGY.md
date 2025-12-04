# PPA 项目分支管理规范

## 分支策略

采用简化的 Git Flow 模型，适合个人项目快速迭代。

### 核心分支

- **main**：稳定版本，定期从 develop 合并
- **develop**：主开发分支，日常工作在此进行

---

## 分支命名规范

常见分支类型：
- `feature/description` - 新功能
- `fix/description` - 缺陷修复
- `refactor/description` - 代码重构
- `chore/description` - 工程变更

**示例**：
- `feature/assessment-export`
- `fix/form-validation-error`
- `refactor/controller-separation`
- `chore/update-dependencies`

---

## 工作流程

### 开发新功能

```bash
git checkout develop
git pull origin develop
git checkout -b feature/description
# 开发...
git push -u origin feature/description
# 创建 PR 成 develop
```

### 发布新版本

```bash
git checkout develop
git checkout -b release/v1.1.0
# 测试、修复...
git tag -a v1.1.0 -m "Release v1.1.0"
git checkout main
git merge --no-ff release/v1.1.0
git checkout develop
git merge --no-ff main
```

---

## 提交规范

遵循 Conventional Commits：

```
<type>(<scope>): <subject>
```

简例：
- `git commit -m "feat: 添加项目导出功能"`
- `git commit -m "fix: 修复表单验证错误"`

---

## 常见命令

```bash
# 查看所有分支
git branch -a

# 创建新分支
git checkout -b feature/description

# 删除本地分支
git branch -d feature/description

# 删除远程分支
git push origin --delete feature/description

# 清清已删除的远程追踪
git fetch --prune
```
