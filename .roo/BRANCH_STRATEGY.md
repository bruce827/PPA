# PPA 项目分支管理策略

## 一、分支模型

采用 **改进的 Git Flow** 模型，兼容团队协作和快速迭代需求。

### 核心分支

#### 1. **main（主分支）**
- **用途**：生产环境稳定版本
- **保护规则**：
  - 禁止直接 push，只接受 PR
  - 所有 PR 需 code review + CI/CD 通过
  - 自动触发生产构建和发布
- **版本标记**：每个稳定版本打 tag（格式：`v1.0.0`）
- **合并来源**：仅来自 `release/` 分支

#### 2. **develop（开发分支）**
- **用途**：下一版本的集成分支
- **保护规则**：
  - 禁止直接 push，只接受 PR
  - 需通过 CI/CD 验证
  - 允许多个功能分支同时合并
- **版本标记**：预发布版本打 tag（格式：`v1.1.0-beta.1`）
- **合并来源**：`feature/`、`bugfix/`、`refactor/` 分支

---

## 二、临时分支命名规范

### 1. **feature（功能开发）**
```
feature/{type}/{description}
```
- `type`：UI | Backend | Database | Integration（可选，用于快速定位）
- `description`：功能简述，使用连字符连接
- **示例**：
  - `feature/UI/project-assessment-form`
  - `feature/Backend/risk-calculation-api`
  - `feature/assessment-export`

### 2. **bugfix（缺陷修复）**
```
bugfix/{module}/{issue-id}-{description}
```
- `module`：前端 frontend | 后端 backend | 数据库 database
- `issue-id`：关联 issue 编号（如无则省略）
- **示例**：
  - `bugfix/frontend/404-form-validation-error`
  - `bugfix/backend/cost-rounding-bug`

### 3. **refactor（代码重构）**
```
refactor/{module}/{description}
```
- `module`：涉及的模块
- **示例**：
  - `refactor/frontend/controller-separation`
  - `refactor/backend/middleware-optimization`

### 4. **hotfix（紧急修复）**
```
hotfix/{module}/{description}
```
- 直接从 `main` 分支切出
- 修复完成后同时合并回 `main` 和 `develop`
- **示例**：`hotfix/backend/database-connection-pool`

### 5. **release（发布准备）**
```
release/v{version}
```
- 仅用于版本发布前的准备和测试
- 由项目负责人创建
- **示例**：`release/v1.1.0`

### 6. **chore（工程变更）**
```
chore/{description}
```
- 依赖更新、配置调整等
- **示例**：`chore/update-dependencies`

---

## 三、工作流程

### 场景 1：开发新功能

```bash
# 1. 从 develop 切出新分支
git checkout develop
git pull origin develop
git checkout -b feature/assessment-result-export

# 2. 提交阶段性代码
git commit -m "feat: 添加导出功能基础框架"

# 3. 创建 PR 到 develop
#    - 填写 PR 描述（见模板）
#    - 邀请 reviewer
#    - 等待 CI/CD 通过

# 4. 代码审查通过后合并
git checkout develop
git merge --no-ff feature/assessment-result-export
git branch -d feature/assessment-result-export
```

### 场景 2：发布新版本

```bash
# 1. 从 develop 切出 release 分支
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# 2. 测试、修复、更新版本号
npm version minor  # 自动更新 package.json

# 3. 创建 PR 到 main
# 4. main 合并后，同步回 develop
git checkout develop
git pull origin main
git merge --no-ff origin/main

# 5. 标记版本
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

### 场景 3：紧急修复（线上 bug）

```bash
# 1. 从 main 切出 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/database-pool-fix

# 2. 修复并测试
git commit -m "fix: 修复数据库连接池泄漏"

# 3. 合并回 main（创建 PR）
# 4. 同步回 develop
git checkout develop
git pull origin develop
git merge --no-ff hotfix/database-pool-fix
```

---

## 四、提交规范

遵循 Conventional Commits，与现有规范保持一致：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### type 列表
- `feat`：新功能
- `fix`：缺陷修复
- `refactor`：代码重构
- `perf`：性能优化
- `test`：测试相关
- `docs`：文档更新
- `chore`：工程变更
- `style`：代码风格

### 示例
```
feat(assessment): 添加项目成本评估导出功能

- 支持 PDF 和 Excel 两种格式
- 包含风险评分在导出中
- 前端通过表单收集参数，后端处理生成

Closes #123
```

---

## 五、分支清理规范

### 定期清理（建议每月一次）

```bash
# 删除已合并的本地分支
git branch --merged develop | grep -v "develop" | xargs git branch -d

# 删除已合并的远程分支
git branch -r --merged origin/develop | \
  grep -v "develop\|main" | \
  sed 's/origin\///' | \
  xargs -I {} git push origin --delete {}

# 同步删除本地追踪的远程分支
git fetch --prune
```

---

## 六、PR 模板与审查标准

### PR 标题格式
```
[类型] 简述（对应分支名）

示例：[feat] 项目评估结果导出功能
```

### PR 描述必填项
- **变更目的**：为什么要做这个改动？
- **实现方式**：主要做了什么？
- **关联 issue**：`Closes #123`
- **测试方法**：如何验证？
- **审查建议**：重点关注的地方

### 前端改动
- 必须附截图或录屏演示

### 后端改动
- 必须附 API 请求/响应示例
- 如涉及数据库变更，需标注迁移步骤

### Reviewer 要求
- 代码改动由至少 1 人 review
- 主 `main` 分支 PR 需至少 1 人 approve
- 所有 CI/CD 检查必须通过

---

## 七、版本管理规范

### 版本号格式
遵循 [Semantic Versioning](https://semver.org/)：`MAJOR.MINOR.PATCH`

- **MAJOR**：重大功能变更或 API 不兼容
- **MINOR**：新增功能（向后兼容）
- **PATCH**：缺陷修复

### Tag 规范
```bash
# 正式发布版本
git tag -a v1.0.0 -m "Release version 1.0.0"

# 预发布版本（开发阶段）
git tag -a v1.1.0-beta.1 -m "Beta release"
git tag -a v1.1.0-rc.1 -m "Release candidate"
```

---

## 八、分支权限与保护规则建议

| 分支 | 直接 Push | PR 审查 | CI/CD | Auto-Merge |
|------|----------|--------|-------|-----------|
| main | ❌ | ✅ 必须 | ✅ 必须 | ❌ |
| develop | ❌ | ✅ 1 人 | ✅ | ✅ |
| release/* | ❌ | ✅ 1 人 | ✅ | ❌ |
| feature/* | ✅ | ✅ 1 人 | ✅ | ❌ |
| hotfix/* | ✅ | ✅ 1 人 | ✅ | ❌ |

---

## 九、常见命令速查

```bash
# 查看分支
git branch -a

# 创建并切换分支
git checkout -b feature/description

# 推送到远程
git push -u origin feature/description

# 本地同步远程删除
git fetch --prune

# 查看分支追踪关系
git branch -vv

# 删除本地分支
git branch -d feature/description

# 删除远程分支
git push origin --delete feature/description

# 查看合并历史
git log --oneline --graph --all --decorate
```

---

## 十、团队约定

1. **分支名称严格遵循规范**，便于自动化工具识别
2. **每个功能/修复对应一个分支**，避免混杂多个改动
3. **定期拉取 develop 到本地分支**，减少合并冲突
4. **PR 描述清晰完整**，方便后续查阅和追溯
5. **已合并分支及时删除**，保持仓库整洁
6. **紧急 hotfix 需通知全队**，避免提交冲突
