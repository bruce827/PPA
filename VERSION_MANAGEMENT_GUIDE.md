# V1.0 和 V1.1 版本管理执行指南

**创建时间**: 2025-12-04  
**目的**: 重新规范项目版本管理，为 V1.1 版本做准备

---

## 📌 核心思路

### 为什么要重新规范版本管理？

你的发现是正确的：**3D 功能不应该属于 V1.0**

**时间线回顾**:
- 2025-11-19：创建 V1.0.0-alpha 标签（核心功能稳定）
- 2025-12-02～03：开发 3D 项目管理（feat_3d 分支）
- 2025-12-03：合并 feat_3d 到 main

**问题**: 现在 main 同时包含 V1.0 内容 + V1.1 新功能（3D），无法区分

**解决方案**: 
- 保留 V1.0.0-alpha 作为 V1.0 的稳定版本标签
- 将 main 标记为 V1.1 的开发分支
- 创建清晰的分支命名规范

---

## 🎯 版本定义

### V1.0（已稳定）
| 项 | 内容 |
|---|---|
| **版本号** | v1.0.0-alpha（稳定） |
| **发布日期** | 2025-11-19 |
| **提交号** | 8bd4518 "测试项目1" |
| **功能** | 项目评估核心功能、AI 分析、风险评估、导出 |
| **标签** | V1.0.0-alpha（分支），v1.0.0-alpha（git tag） |
| **后续** | 仅接收紧急 hotfix（如 v1.0.1、v1.0.2） |

### V1.1（开发中）
| 项 | 内容 |
|---|---|
| **版本号** | v1.1.0-dev（开发中） |
| **开发分支** | main |
| **包含功能** | V1.0 全部 + 3D 项目管理 |
| **新增内容** | 3D 配置、3D 项目 CRUD、Web3D 集成 |
| **预期** | 开发完成后创建 v1.1.0 tag |
| **后续** | 接受 feature/v1.1.* 分支合并 |

---

## 🔧 执行计划

### 第一阶段：删除无用分支

#### 需要删除的分支清单

**本地分支** (共 7 个，除了 main/V1.0.0-alpha/feat_3d 外的所有):

```
feat_agent              ← 单独的 AI agent 功能分支，已被集成
feat_ai_provider        ← AI 提供商选择分支（a0d1bcc），已在 main
feat_server_refactor    ← 服务器重构分支，已被整合
fix_export              ← 导出功能修复分支，已在 main
opt_risk_database       ← 数据库优化分支，已被放弃/集成
feat_3d                 ← V1.1 3D 功能分支（已合并到 main，待清理）
```

**远程分支** (对应上述本地分支):

```
origin/feat_agent
origin/feat_ai_provider
origin/feat_server_refactor
origin/fix_export
origin/opt_risk_database
origin/feat_3d
origin/copilot/update-agents-documentation  ← 文档更新分支
```

#### 删除命令

```bash
# 删除本地分支（一次性执行）
git branch -d feat_agent feat_ai_provider feat_server_refactor fix_export opt_risk_database feat_3d

# 删除远程分支（一次性执行）
git push origin --delete feat_agent feat_ai_provider feat_server_refactor fix_export opt_risk_database feat_3d copilot/update-agents-documentation
```

**说明**:
- `-d` 选项会在确认分支已合并后才删除，安全
- 如果某个分支未合并，git 会提示，可用 `-D` 强制删除（但请先确认内容已保存）

---

### 第二阶段：建立版本标签

#### 当前标签状态

检查现有标签:
```bash
git tag -l -n5
# 应该显示:
# v1.0.0-alpha    V1.0 version tag
```

#### 为 V1.1 创建开发标签

```bash
# 为当前 main 分支创建 v1.1.0-dev 标签
git tag -a v1.1.0-dev -m "V1.1 Development Release - Add 3D Project Management"

# 推送到远程
git push origin v1.1.0-dev
```

**说明**:
- 这个标签标记了 V1.1 开发的起点（main 当前状态）
- "dev" 后缀表示这是开发中的版本，不是正式发布
- 当 V1.1 功能完成并稳定时，创建 v1.1.0（正式版本）

#### 验证标签

```bash
git tag -l
git show v1.1.0-dev     # 查看 v1.1.0-dev 标签的详细信息
git show v1.0.0-alpha   # 查看 v1.0.0-alpha 标签的详细信息
```

---

### 第三阶段：建立分支命名规范

#### 分支命名模板

为了未来的开发清晰有序，建立以下分支命名规范：

```
feature/v1.1.x-<description>      # 新功能分支（x=小版本号，description=功能描述）
                                  # 示例: feature/v1.1.0-dashboard-enhance

bugfix/v1.1.x-<description>       # bug 修复分支（在 V1.1 上）
                                  # 示例: bugfix/v1.1.0-export-error

hotfix/v1.0.x-<description>       # 紧急修复分支（针对 V1.0）
                                  # 示例: hotfix/v1.0.1-calculation-fix

refactor/v1.1.x-<description>     # 重构分支
                                  # 示例: refactor/v1.1.0-service-layer
```

#### 规范说明

| 分支前缀 | 用途 | 基于分支 | 发布后 |
|---|---|---|---|
| `feature/` | 新功能开发 | main (V1.1) | Merge → main，创建 tag |
| `bugfix/` | V1.1 bug 修复 | main (V1.1) | Merge → main |
| `hotfix/` | V1.0 紧急修复 | V1.0.0-alpha | Merge → V1.0.0-alpha，创建新 tag |
| `refactor/` | 代码重构 | main (V1.1) | Merge → main |

#### 提交信息规范

```
feat: 添加 3D 项目列表页面        # 新功能
fix: 修复导出时间格式错误         # bug 修复
refactor: 重构 dashboard service  # 重构
docs: 更新 V1.1 功能文档          # 文档更新
```

---

## ✅ 清理后的项目结构

### 分支结构（清理后）

```
本地分支:
  V1.0.0-alpha    ← V1.0 稳定版本标签（分支）
  main            ← V1.1 开发主线

远程分支:
  origin/HEAD → origin/main
  origin/V1.0.0-alpha
  origin/main

标签:
  v1.0.0-alpha    ← V1.0 正式版本标签（2025-11-19）
  v1.1.0-dev      ← V1.1 开发版本标签（2025-12-04）
```

### 验证命令

执行以下命令确保清理成功：

```bash
# 1. 验证本地分支（应该只有 3 个）
git branch
# 输出应为:
#   V1.0.0-alpha
# * main

# 2. 验证远程分支（应该只有 3 个）
git branch -r
# 输出应为:
#   origin/HEAD -> origin/main
#   origin/V1.0.0-alpha
#   origin/main

# 3. 验证标签（应该有 2 个）
git tag -l
# 输出应为:
#   v1.0.0-alpha
#   v1.1.0-dev
```

---

## 📝 后续版本管理流程

### 场景 1：在 V1.1 上开发新功能

```bash
# 1. 从 main 创建新功能分支
git checkout -b feature/v1.1.0-web3d-viewer main

# 2. 开发功能...
# 3. 提交代码
git add .
git commit -m "feat: 添加 3D 模型查看器"

# 4. 推送到远程
git push origin feature/v1.1.0-web3d-viewer

# 5. 创建 PR（如果使用 GitHub）
# 合并到 main

# 6. 合并后，删除功能分支
git branch -d feature/v1.1.0-web3d-viewer
git push origin --delete feature/v1.1.0-web3d-viewer
```

### 场景 2：V1.0 需要紧急修复

```bash
# 1. 基于 V1.0.0-alpha 创建 hotfix 分支
git checkout -b hotfix/v1.0.1-calculation-fix V1.0.0-alpha

# 2. 修复 bug...
# 3. 提交修复
git add .
git commit -m "fix: 修复成本计算误差"

# 4. 创建 V1.0.1 标签
git tag -a v1.0.1 -m "V1.0.1 Hotfix - Fix calculation error"
git push origin v1.0.1

# 5. 也需要合并回 main（如果还要继续用）
git checkout main
git merge hotfix/v1.0.1-calculation-fix
git push origin main

# 6. 清理分支
git branch -d hotfix/v1.0.1-calculation-fix
```

### 场景 3：V1.1 开发完成，准备发布

```bash
# 1. 确保 main 分支所有代码已提交
git status

# 2. 创建 V1.1.0 正式版本标签
git tag -a v1.1.0 -m "V1.1.0 Release - Add 3D Project Management Features"

# 3. 推送标签到远程
git push origin v1.1.0

# 4. 可选：删除 dev 标签
git tag -d v1.1.0-dev
git push origin --delete v1.1.0-dev

# 5. 后续如果继续开发 V1.1.1，创建新的 dev 标签
git tag -a v1.1.1-dev -m "V1.1.1 Development"
git push origin v1.1.1-dev
```

---

## 🎓 总结

### 清理前的问题
- ❌ 多个无用的功能分支散落各处
- ❌ 版本管理混乱，无法区分 V1.0 和 V1.1
- ❌ 分支命名不规范
- ❌ 标签管理不清晰

### 清理后的优势
- ✅ 只保留核心分支（main + V1.0.0-alpha）
- ✅ 清晰的版本标签体系（v1.0.0-alpha + v1.1.0-dev）
- ✅ 规范的分支命名（feature/bugfix/hotfix/refactor）
- ✅ 清晰的版本发布流程

### 执行步骤速览

1. **删除无用分支** (~1分钟)
   ```bash
   git branch -d feat_agent feat_ai_provider feat_server_refactor fix_export opt_risk_database feat_3d
   git push origin --delete feat_agent feat_ai_provider feat_server_refactor fix_export opt_risk_database feat_3d copilot/update-agents-documentation
   ```

2. **创建 V1.1 标签** (~30秒)
   ```bash
   git tag -a v1.1.0-dev -m \"V1.1 Development Release - Add 3D Project Management\"
   git push origin v1.1.0-dev
   ```

3. **验证清理结果** (~30秒)
   ```bash
   git branch
   git branch -r
   git tag -l
   ```

**预计总耗时**: 2-3 分钟

---

## 📚 参考资源

- Git tag 文档：`git help tag`
- Git branch 文档：`git help branch`
- Git push 文档：`git help push`

需要帮助？可以运行 `git status` 查看当前状态。
