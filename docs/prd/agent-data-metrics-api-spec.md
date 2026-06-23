# PPA - 大屏原型 Agent 协作与双向同步 OpenAPI 规范 (V2.0)

本规格文档旨在定义 PPA（Project Portfolio Assessment）系统大屏数据指标（Data Metrics）模块与第三方协作 Agent（原型绘制、网格排版及 Web3D 编辑智能体）之间的双向通信契约。

**文档受众**：接入本系统的外部 Agent（LLM）、前端开发工程师、系统集成架构师。
**核心目标**：实现“Agent 读取指标 -> 推荐 Canvas 布局坐标 -> 回写 3D 视角与网格备注 -> 一键转化为 PPA 项目成本模板”的完整闭环。

---

## 1. 统一安全认证规范 (Security Gate)

为保证本地及局域网调用的安全性，所有 API-Key 受控路由必须经过 `agentAuthMiddleware` 安全拦截器。

* **认证 Header 字段**: `X-Agent-API-Key`
* **默认测试令牌**: `ppa_agent_secret_token_2026` *(生产环境建议通过环境变量 `PPA_AGENT_SECRET_KEY` 进行重写覆盖)*
* **未授权响应**:
  ```json
  {
    "success": false,
    "error_code": "UNAUTHORIZED_AGENT_ACCESS",
    "error": "外部 Agent 未授权。",
    "hint": "请确保在 Request Headers 中正确配置 \"X-Agent-API-Key\" 参数。"
  }
  ```

---

## 2. 接口端点规范 (API Endpoints)

所有接口统一前缀：`/api/data-metrics`

### 2.1 获取极简大纲上下文 (getAgentContext)
专门为 LLM 设计的高内聚、低 Token 消耗接口，支持输出对大模型最友好的极简 Markdown 大纲。

* **HTTP 方法**: `GET`
* **请求路径**: `/api/data-metrics/projects/:id/agent-context`
* **Query 参数**:
  * `format` (string, 可选): `markdown` 或 `json`。默认值为 `markdown`。

#### A. Markdown 极简输出 (推荐给大模型作为 Context)
* **Response Headers**: `Content-Type: text/plain`
* **响应 Body 示例**:
  ```markdown
  # 项目大屏指标大纲: 油田生产可视化大屏 (ID: 2)

  ## 模块: 产销动态
  ### 一级场景: 库存 | 二级场景: 储气库
  - 指标: 日采气量 | 展示: KPI_CARD | 周期: 日 | 预警: 无
  - 指标: 月累计（采气） | 展示: TABLE | 周期: 日 | 预警: 无
  ```

#### B. JSON 结构输出
* **Response Headers**: `Content-Type: application/json`
* **响应 Body 示例**:
  ```json
  {
    "success": true,
    "data": {
      "projectId": 2,
      "projectName": "油田生产可视化大屏",
      "tree": [
        {
          "module": "产销动态",
          "scenes": [
            {
              "sceneL1": "库存",
              "sceneL2": "储气库",
              "metrics": [
                {
                  "name": "日采气量",
                  "type": "KPI_CARD",
                  "cycle": "日",
                  "warning": "无"
                }
              ]
            }
          ]
        }
      ]
    }
  }
  ```

---

### 2.2 获取推荐的大屏 12 栅格 Canvas 坐标 DSL (generateAgentLayout)
自动根据不同指标组件展示类型的复杂度，输出推荐的 12 栅格自适应布局 DSL 占位符。

* **HTTP 方法**: `GET`
* **请求路径**: `/api/data-metrics/projects/:id/agent-layout`
* **响应 Body 示例**:
  ```json
  {
    "success": true,
    "data": {
      "projectId": 2,
      "projectName": "油田生产可视化大屏",
      "layout": [
        {
          "metric_id": 24,
          "metric_name": "日采气量",
          "module_name": "产销动态",
          "scene_l1": "库存",
          "display_type": "统计数据",
          "grid": {
            "x": 0,
            "y": 0,
            "w": 3,
            "h": 2
          },
          "component_hint": "ECharts翻牌器"
        },
        {
          "metric_id": 25,
          "metric_name": "月累计（采气）",
          "module_name": "产销动态",
          "scene_l1": "库存",
          "display_type": "表格",
          "grid": {
            "x": 0,
            "y": 2,
            "w": 12,
            "h": 5
          },
          "component_hint": "AntD自适应表格"
        }
      ]
    }
  }
  ```

---

### 2.3 外部 Agent 回写排版布局与 Web3D 参数同步 (saveAgentFeedback)
接受协作 Agent 设计完大屏、或 Web3D 编辑器微调完视角后的状态回传，执行数据非破坏性物理更新。

* **HTTP 方法**: `POST`
* **请求路径**: `/api/data-metrics/projects/:id/agent-feedback`
* **请求 Body (JSON)**:
  ```json
  {
    "layout": [
      {
        "metric_name": "日完成",
        "grid": {
          "x": 5,
          "y": 5,
          "w": 6,
          "h": 4
        }
      }
    ],
    "web3d_settings": {
      "camera_position": [100, 200, 300],
      "fov": 60
    }
  }
  ```
* **业务持久化策略**:
  1. 遍历 `layout` 数组，利用 `metric_name` 匹配大屏下属指标；
  2. 将 `grid` 参数翻译为 `[Grid: x=5, y=5, w=6, h=4]` 追加并安全覆写至指标表的 `remark` 字段（免去修改数据库字段带来的侵入性风险）；
  3. 将 `web3d_settings` 以 JSON 文本追加形式合并更新至大屏项目配置表的 `project_desc` 字段，且前置继承项目原有名及绑定项目，保证查询不抛出 SQLITE 字段缺失错误。
* **响应 Body 示例**:
  ```json
  {
    "success": true,
    "data": {
      "projectId": 2,
      "updatedCount": 1,
      "web3dSynced": true
    }
  }
  ```

---

### 2.4 一键转化为 PPA 项目成本估算模板 (convertToPpaTemplate)
大屏绘制完成后，打通业务流向研发估算流。将指标复杂度全自动折算为前后端人天。

* **HTTP 方法**: `POST`
* **请求路径**: `/api/data-metrics/projects/:id/convert-to-ppa-template`
* **核心工时折算换算矩阵 (Workload Mapping Matrix)**:
  根据组件的 `display_type` 自动换算人天，不满足的默认置为 `前端1人天 + 后端1人天`：
  
  | 大屏展示类型 (`display_type`) | 推荐前端研发工时 (人天) | 推荐后端研发工时 (人天) |
  | :--- | :--- | :--- |
  | **统计数据 / 视频** | 0.5 | 0.5 |
  | **柱状图 / 条形图 / 折线图 / 饼图** | 1.0 | 1.0 |
  | **表格** | 2.0 | 2.0 |
  | **地图** | 2.5 | 2.0 |

* **响应 Body 示例**:
  ```json
  {
    "success": true,
    "data": {
      "ppaTemplateId": 97,
      "ppaTemplateName": "【大屏导入】油田生产可视化大屏",
      "mappedMetricsCount": 28,
      "initialEstimatedWorkload": "36 人天"
    }
  }
  ```

---

### 2.5 免分页指标数据完整平铺 JSON 导出 (exportToJson)
用于 Agent 完整获取全量指标清单的无状态原始数据集，不设任何分页。

* **HTTP 方法**: `GET`
* **请求路径**: `/api/data-metrics/projects/:id/export/json`
* **响应 Body 示例**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 24,
        "dm_project_id": 2,
        "application": null,
        "module_name": "产销动态",
        "scene_l1": "库存",
        "scene_l2": "储气库",
        "metric_name": "日采气量",
        "display_type": "统计数据",
        "data_source_logic": "日完成、月累计等全部字段，全公司合计，采气-日完成",
        "algorithm": "采气-日完成，单位为亿方",
        "collection_cycle": "日",
        "source_system": "青海油田生产信息管理系统",
        "source_module": "统计分析-储气库信息",
        "integration_method": null,
        "remark": "[Grid: x=0, y=0, w=3, h=2]",
        "created_at": "2026-06-15 13:54:26",
        "updated_at": "2026-06-15 13:54:26"
      }
    ]
  }
  ```

---

## 3. 开发测试参考 (Minimal Integration Code)

以下为 Node.js 环境下使用 `axios` 或原生 `fetch` 与此 Agent Gateway 进行双向通信的极简代码范例，外部大模型可直接读取：

```javascript
const axios = require('axios');

const PPA_BASE_URL = 'http://localhost:3001/api/data-metrics';
const AGENT_SECRET_KEY = 'ppa_agent_secret_token_2026'; // Header 凭证

// 定义 API 呼叫客户端
const agentClient = axios.create({
  baseURL: PPA_BASE_URL,
  headers: {
    'X-Agent-API-Key': AGENT_SECRET_KEY,
    'Content-Type': 'application/json'
  }
});

async function runAgentFlow(projectId) {
  try {
    // 1. 获取紧凑 Markdown 格式的大屏幕后大纲
    const contextRes = await agentClient.get(`/projects/${projectId}/agent-context?format=markdown`);
    console.log('✅ 大纲提取成功 (Markdown 格式):');
    console.log(contextRes.data);

    // 2. 仿真大语言模型进行 Canvas 画布 12栅格 坐标推荐
    const mockFeedbackBody = {
      layout: [
        { metric_name: "日完成", grid: { x: 4, y: 4, w: 6, h: 4 } }
      ],
      web3d_settings: { camera_position: [0, 150, 450], fov: 45 }
    };
    const feedbackRes = await agentClient.post(`/projects/${projectId}/agent-feedback`, mockFeedbackBody);
    console.log('✅ 布局与 3D 参数闭环回写成功。更新项：', feedbackRes.data.data.updatedCount);

    // 3. 业务流打通：一键将大屏折算换算人天，推入 PPA 项目评估库
    const ppaTemplateRes = await agentClient.post(`/projects/${projectId}/convert-to-ppa-template`);
    console.log('✅ PPA 项目估算模板已建立，模板ID：', ppaTemplateRes.data.data.ppaTemplateId);
    console.log('📈 推荐换算基础工时：', ppaTemplateRes.data.data.initialEstimatedWorkload);

  } catch (error) {
    console.error('❌ Agent 协作流发生错误：', error.response ? error.response.data : error.message);
  }
}

// 模拟调用
runAgentFlow(2);
```
