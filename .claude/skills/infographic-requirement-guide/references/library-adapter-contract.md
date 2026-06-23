# Library Adapter Contract v1 [已废弃/Deprecated]

> **状态**: 已废弃。当前版本使用 `./template/` 作为默认模板来源，不再依赖外部 `library/` 目录或 API 接口。
> 
> **适用场景**: 仅当未来项目中存在 `library/` 正式资产库时才需要参考此文档。

**原始用途**: 让 `infographic-requirement-guide` 以稳定方式读取 Chart Master React 项目维护的生产级模板、风格与主题资产。

---

## 1. 目标（历史参考）

解决三个问题：

1. `library/` 才是正式资产库，但 Skill 之前没有稳定聚合读取入口。
2. 模板详情 API 只返回 meta 与文件存在性，不足以让 Skill 直接消费。
3. 风格 `meta_prompt`、主题 `global_css`、模板 `prompt/html` 分散在不同文件中，需要统一取回。

---

## 2. 唯一正式真源（历史参考）

生产场景下，以下内容以 Chart Master `library/` 为唯一真源：

- 结构维度：`library/dimensions/structure.json`
- 风格维度：`library/dimensions/style.json`
- 主题资产：`library/themes/themes.json`
- 模板索引：`library/templates/index.json`
- 模板重资产：`library/templates/items/<templateId>/...`

Skill 内的 `./template/`：
- 用途仅为 demo、沙盒验证、回归演示
- 不应作为生产级模板资产库长期演进

---

## 3. 适配接口（历史参考）

后端聚合接口：

- `GET /api/v1/agent/template-resolve`

支持两种读取方式：

1. 精确模板
- `templateId`

2. 按矩阵 Cell 自动解析
- `structureId + styleId`
- 或 `structureCode + styleCode`

可选参数：

- `includeContent=true|false`
  - 默认 `true`
  - 为 `true` 时返回 `html/svg/prompt_md/texture_prompt` 文本内容

---

> **注意**: 以上接口规格仅供历史参考，当前版本不使用。
