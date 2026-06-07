# 表单设计模块 - 数据初始化指南

## 概述

表单设计模块的数据初始化是将 Excel 表单模板导入到 SQLite 数据库的过程。初始化完成后，系统运行时完全依赖数据库，不再需要 Excel 文件。

## 前置条件

1. Python 3 已安装
2. openpyxl 库已安装（`pip install openpyxl`）
3. Excel 模板文件已准备好

## Excel 模板要求

### 文件位置

```
PPA/
└── docs/
    └── 表单导入模版_监督管理-20260528_v1.xlsx
```

### 工作表结构（3张）

| 工作表 | 说明 | 行数 | 列数 |
|---|---|---|---|
| 表单数据导入模版 | 主表，包含字段定义 | ~530 | 47（33列有效） |
| 表单字典值 | 下拉枚举源 | 23 | 12 |
| 系统对应表 | 来源系统与URL映射 | 17 | 4 |

### 列结构（33列，双层复合表头）

| 列族 | 包含列 |
|---|---|
| 表单信息 | 应用名称、表单名称、表单编码、过滤条件 |
| 基本信息-数据库信息 | 字段名称、字段编码、是否主键、是否虚拟字段、字段类型、字段长度、字段精度、默认值 |
| 基本信息 | 输入类型、输入参数、是否必填、是否唯一、提示信息、备注 |
| 卡片页面信息 | 卡片分组、卡片排序、卡片宽度、新增控制、更新控制、详情控制 |
| 列表页面信息 | 列表宽度、列表控制、列表排序、列表格式化 |
| 过滤条件 | 是否过滤器、过滤方式、过滤器默认值、过滤器提示信息、来源系统 |

## 初始化步骤

### 步骤 1：解析 Excel → JSON

```bash
cd PPA
python3 scripts/form-design/parse_excel.py
```

**输出**：
- 文件：`data/forms/forms.json`
- 内容：18 个表单、525 个字段的结构化数据

**验证**：
```bash
cat data/forms/forms.json | python3 -m json.tool | head -20
```

### 步骤 2：导入 JSON → SQLite

```bash
cd PPA
python3 scripts/form-design/import_to_db.py --reset
```

**参数说明**：
- `--reset`：清空现有数据后导入（首次导入必须使用）
- 不加 `--reset`：追加导入（可能产生重复数据）

**输出**：
```
读取 JSON: 18 个表单, 525 个字段
表结构创建完成
已清空表数据
创建设计项目: 监督管理项目 (id=1)
  应用: 青海油田安全生产智能管控平台 (id=1)
  表单: 平台总问题库 (supervision_issue_platform) id=1
  表单: 审核问题库 (supervision_issue_audit) id=2
  ...
导入完成: 1 个项目, 18 个表单, 525 个字段

验证: 1 个项目, 1 个应用, 18 个表单, 525 个字段
```

### 步骤 3：验证数据

```bash
# 检查数据库表
sqlite3 server/ppa.db "SELECT COUNT(*) FROM form_project;"
sqlite3 server/ppa.db "SELECT COUNT(*) FROM form_app;"
sqlite3 server/ppa.db "SELECT COUNT(*) FROM form_definition;"
sqlite3 server/ppa.db "SELECT COUNT(*) FROM form_field;"
```

**预期结果**：
- form_project: 1
- form_app: 1
- form_definition: 18
- form_field: 525

### 步骤 4：重启后端服务

```bash
cd server
node index.js
```

### 步骤 5：验证 API

```bash
# 统计信息
curl http://localhost:3001/api/form-design/stats

# 项目列表
curl http://localhost:3001/api/form-design/projects

# 表单列表
curl http://localhost:3001/api/form-design/apps/1/forms
```

## 重新初始化

如果需要重新初始化（覆盖所有数据）：

```bash
cd PPA

# 重新解析 Excel（如果 Excel 有更新）
python3 scripts/form-design/parse_excel.py

# 重新导入（覆盖现有数据）
python3 scripts/form-design/import_to_db.py --reset
```

## 数据库表结构

### form_project（设计项目表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| project_name | TEXT | 项目名称 |
| project_desc | TEXT | 项目描述 |
| linked_project_id | INTEGER | 关联的历史项目ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### form_app（应用表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| app_name | TEXT | 应用名称 |
| app_code | TEXT | 应用编码 |
| project_id | INTEGER | 关联的项目ID |
| description | TEXT | 描述 |
| sort_order | INTEGER | 排序 |

### form_definition（表单定义表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| app_id | INTEGER | 关联的应用ID |
| form_name | TEXT | 表单名称 |
| form_code | TEXT | 表单编码 |
| filter_condition | TEXT | 过滤条件 |
| description | TEXT | 描述 |

### form_field（字段定义表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| form_id | INTEGER | 关联的表单ID |
| field_name | TEXT | 字段名称 |
| field_code | TEXT | 字段编码 |
| is_primary_key | INTEGER | 是否主键 |
| is_virtual | INTEGER | 是否虚拟字段 |
| field_type | TEXT | 字段类型 |
| field_length | INTEGER | 字段长度 |
| field_precision | INTEGER | 字段精度 |
| input_type | TEXT | 输入类型（中文） |
| input_type_code | TEXT | 输入类型（编码） |
| input_component | TEXT | 前端组件 |
| input_params | TEXT | 输入参数（JSON） |
| is_required | INTEGER | 是否必填 |
| card_group | TEXT | 卡片分组 |
| card_width | TEXT | 卡片宽度 |
| add_control | TEXT | 新增控制 |
| update_control | TEXT | 更新控制 |
| detail_control | TEXT | 详情控制 |
| list_control | TEXT | 列表控制 |

## 常见问题

### Q1: 导入时报错 "Database not initialized"

**原因**：数据库未初始化

**解决**：
```bash
cd server
node init-db.js
```

### Q2: 导入后数据为空

**原因**：可能没有使用 `--reset` 参数

**解决**：
```bash
python3 scripts/form-design/import_to_db.py --reset
```

### Q3: Excel 模板更新后如何同步

**方案**：重新运行初始化流程

```bash
# 重新解析
python3 scripts/form-design/parse_excel.py

# 重新导入（会覆盖现有数据）
python3 scripts/form-design/import_to_db.py --reset
```

**注意**：这会覆盖页面上的所有修改，建议先导出备份。

### Q4: 如何备份当前数据

**方案**：导出数据库文件

```bash
cp server/ppa.db server/ppa.db.backup
```

### Q5: 页面上的修改会同步到 Excel 吗

**答案**：不会。当前是单向流程：Excel → 数据库 → 页面

页面修改只保存到数据库，不会影响 Excel 文件。

## 相关文件

| 文件 | 说明 |
|---|---|
| `docs/表单导入模版_监督管理-20260528_v1.xlsx` | Excel 模板 |
| `scripts/form-design/parse_excel.py` | Excel 解析脚本 |
| `scripts/form-design/import_to_db.py` | 数据导入脚本 |
| `data/forms/forms.json` | 解析后的 JSON 数据 |
| `server/ppa.db` | SQLite 数据库 |
| `server/migrations/015_create_form_design_tables.js` | 数据库迁移脚本 |
