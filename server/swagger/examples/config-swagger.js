/**
 * 这个文件展示了如何为配置路由添加Swagger注释
 * 实际使用时，应该将这些注释添加到对应的路由文件中
 */

/**
 * @swagger
 * /api/config/roles:
 *   get:
 *     summary: 获取所有角色配置
 *     description: 获取系统中所有角色的配置信息，包括角色名称和单价
 *     tags: [配置管理]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功获取角色列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建新角色
 *     description: 创建一个新的角色配置
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_name
 *               - unit_price
 *             properties:
 *               role_name:
 *                 type: string
 *                 description: 角色名称
 *                 example: "前端工程师"
 *               unit_price:
 *                 type: number
 *                 description: 单价（元/人/天）
 *                 example: 1800
 *     responses:
 *       201:
 *         description: 角色创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/roles/{id}:
 *   put:
 *     summary: 更新角色配置
 *     description: 更新指定ID的角色配置信息
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 角色ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_name:
 *                 type: string
 *                 description: 角色名称
 *                 example: "高级前端工程师"
 *               unit_price:
 *                 type: number
 *                 description: 单价（元/人/天）
 *                 example: 2200
 *     responses:
 *       200:
 *         description: 角色更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: 删除角色配置
 *     description: 删除指定ID的角色配置
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 角色ID
 *     responses:
 *       200:
 *         description: 角色删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "角色删除成功"
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/risk-items:
 *   get:
 *     summary: 获取所有风险评估项
 *     description: 获取系统中所有风险评估项的配置信息
 *     tags: [配置管理]
 *     responses:
 *       200:
 *         description: 成功获取风险评估项列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RiskItem'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建风险评估项
 *     description: 创建一个新的风险评估项
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item_name
 *               - options_json
 *             properties:
 *               item_name:
 *                 type: string
 *                 description: 风险项名称
 *                 example: "技术风险"
 *               description:
 *                 type: string
 *                 description: 风险项描述
 *                 example: "技术实现难度和复杂度"
 *               options_json:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       description: 分数
 *                     label:
 *                       type: string
 *                       description: 标签
 *                     description:
 *                       type: string
 *                       description: 选项描述
 *                 example: [
 *                   {"score": 5, "label": "低", "description": "技术难度低"},
 *                   {"score": 10, "label": "中", "description": "技术难度中等"},
 *                   {"score": 15, "label": "高", "description": "技术难度高"}
 *                 ]
 *     responses:
 *       201:
 *         description: 风险评估项创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RiskItem'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/travel-costs:
 *   get:
 *     summary: 获取所有差旅成本配置
 *     description: 获取系统中所有城市的差旅成本配置
 *     tags: [配置管理]
 *     responses:
 *       200:
 *         description: 成功获取差旅成本列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TravelCost'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建差旅成本配置
 *     description: 创建一个新的城市差旅成本配置
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city
 *               - cost_per_month
 *             properties:
 *               city:
 *                 type: string
 *                 description: 城市名称
 *                 example: "北京"
 *               cost_per_month:
 *                 type: number
 *                 description: 每月成本（元/人）
 *                 example: 8000
 *               active:
 *                 type: boolean
 *                 description: 是否启用
 *                 example: true
 *     responses:
 *       201:
 *         description: 差旅成本配置创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TravelCost'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/all:
 *   get:
 *     summary: 获取所有配置数据
 *     description: 一次性获取所有配置数据，包括角色、风险项、差旅成本等
 *     tags: [配置管理]
 *     responses:
 *       200:
 *         description: 成功获取所有配置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *                     risk_items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RiskItem'
 *                     travel_costs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TravelCost'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/ai-models:
 *   get:
 *     summary: 获取AI模型配置列表
 *     description: 获取所有AI模型的配置信息，按创建时间倒序排列
 *     tags: [配置管理]
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [openai, doubao, gemini, minimax, cherry-studio]
 *         description: 按提供商筛选
 *       - in: query
 *         name: is_current
 *         schema:
 *           type: boolean
 *         description: 是否为当前使用模型
 *     responses:
 *       200:
 *         description: 成功获取AI模型列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AIModel'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建AI模型配置
 *     description: 创建一个新的AI模型配置
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - model_name
 *               - api_host
 *               - api_key
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [openai, doubao, gemini, minimax, cherry-studio]
 *                 description: 提供商
 *                 example: "openai"
 *               model_name:
 *                 type: string
 *                 description: 模型名称
 *                 example: "gpt-4"
 *               api_host:
 *                 type: string
 *                 description: API主机地址
 *                 example: "https://api.openai.com"
 *               api_key:
 *                 type: string
 *                 description: API密钥
 *                 example: "sk-..."
 *               supports_vision:
 *                 type: boolean
 *                 description: 是否支持视觉功能
 *                 example: false
 *               supports_web_search:
 *                 type: boolean
 *                 description: 是否支持网络搜索
 *                 example: false
 *     responses:
 *       201:
 *         description: AI模型配置创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AIModel'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/ai-models/current:
 *   get:
 *     summary: 获取当前使用的AI模型
 *     description: 获取当前系统正在使用的AI模型配置
 *     tags: [配置管理]
 *     responses:
 *       200:
 *         description: 成功获取当前模型
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AIModel'
 *       404:
 *         description: 未设置当前模型
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/ai-models/{id}/set-current:
 *   post:
 *     summary: 设置当前使用的AI模型
 *     description: 将指定ID的AI模型设置为当前使用的模型
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: AI模型ID
 *     responses:
 *       200:
 *         description: 设置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AIModel'
 *       404:
 *         description: 模型不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/ai-models/{id}/test:
 *   post:
 *     summary: 测试AI模型连接
 *     description: 测试指定ID的AI模型连接是否正常
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: AI模型ID
 *     responses:
 *       200:
 *         description: 测试成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     latency:
 *                       type: number
 *                       description: 响应延迟（毫秒）
 *                       example: 150
 *       404:
 *         description: 模型不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 连接测试失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/prompts:
 *   get:
 *     summary: 获取提示词模板列表
 *     description: 获取所有提示词模板，支持分页和筛选
 *     tags: [配置管理]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [risk_analysis, module_analysis, workload_evaluation, project_tag]
 *         description: 按分类筛选
 *       - in: query
 *         name: is_system
 *         schema:
 *           type: boolean
 *         description: 是否为系统模板
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: 是否启用
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功获取模板列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PromptTemplate'
 *                     total:
 *                       type: integer
 *                       description: 总数量
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                     pageSize:
 *                       type: integer
 *                       description: 每页数量
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建提示词模板
 *     description: 创建一个新的提示词模板
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - content
 *             properties:
 *               name:
 *                 type: string
 *                 description: 模板名称
 *                 example: "风险评估模板"
 *               category:
 *                 type: string
 *                 enum: [risk_analysis, module_analysis, workload_evaluation, project_tag]
 *                 description: 模板分类
 *                 example: "risk_analysis"
 *               content:
 *                 type: string
 *                 description: 模板内容
 *                 example: "请分析以下项目的风险：{{project_description}}"
 *               variables_json:
 *                 type: object
 *                 description: 模板变量定义
 *                 example: {"project_description": {"type": "string", "required": true}}
 *               is_system:
 *                 type: boolean
 *                 description: 是否为系统模板
 *                 example: false
 *               is_active:
 *                 type: boolean
 *                 description: 是否启用
 *                 example: true
 *               module_tag:
 *                 type: string
 *                 description: 模块标签
 *                 example: "风险评估"
 *     responses:
 *       201:
 *         description: 模板创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PromptTemplate'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/prompts/{id}:
 *   get:
 *     summary: 获取提示词模板详情
 *     description: 获取指定ID的提示词模板详情
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模板ID
 *     responses:
 *       200:
 *         description: 成功获取模板详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PromptTemplate'
 *       404:
 *         description: 模板不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: 更新提示词模板
 *     description: 更新指定ID的提示词模板
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模板ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 模板名称
 *               category:
 *                 type: string
 *                 enum: [risk_analysis, module_analysis, workload_evaluation, project_tag]
 *                 description: 模板分类
 *               content:
 *                 type: string
 *                 description: 模板内容
 *               variables_json:
 *                 type: object
 *                 description: 模板变量定义
 *               is_system:
 *                 type: boolean
 *                 description: 是否为系统模板
 *               is_active:
 *                 type: boolean
 *                 description: 是否启用
 *               module_tag:
 *                 type: string
 *                 description: 模块标签
 *     responses:
 *       200:
 *         description: 模板更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PromptTemplate'
 *       404:
 *         description: 模板不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: 删除提示词模板
 *     description: 删除指定ID的提示词模板（系统模板禁止删除）
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模板ID
 *     responses:
 *       200:
 *         description: 模板删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "模板删除成功"
 *       404:
 *         description: 模板不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: 系统模板禁止删除
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/prompts/{id}/copy:
 *   post:
 *     summary: 复制提示词模板
 *     description: 复制指定ID的提示词模板，新模板名称会追加"(副本)"
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 源模板ID
 *     responses:
 *       201:
 *         description: 模板复制成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PromptTemplate'
 *       404:
 *         description: 源模板不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/prompts/{id}/preview:
 *   post:
 *     summary: 预览提示词模板
 *     description: 使用提供的变量值预览提示词模板渲染结果
 *     tags: [配置管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模板ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - variable_values
 *             properties:
 *               variable_values:
 *                 type: object
 *                 description: 模板变量值
 *                 example: {"project_description": "这是一个示例项目"}
 *     responses:
 *       200:
 *         description: 预览成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     rendered_content:
 *                       type: string
 *                       description: 渲染后的提示词内容
 *                       example: "请分析以下项目的风险：这是一个示例项目"
 *       404:
 *         description: 模板不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/prompt-module-tags:
 *   get:
 *     summary: 获取推荐模块标签
 *     description: 获取用于前端下拉选择的推荐模块标签列表
 *     tags: [配置管理]
 *     responses:
 *       200:
 *         description: 成功获取模块标签列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 标签ID
 *                       name:
 *                         type: string
 *                         description: 标签名称
 *                         example: "风险评估"
 *                       description:
 *                         type: string
 *                         description: 标签描述
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建模块标签
 *     description: 创建一个新的模块标签
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 标签名称
 *                 example: "工作量评估"
 *               description:
 *                 type: string
 *                 description: 标签描述
 *                 example: "用于工作量评估相关的提示词模板"
 *     responses:
 *       201:
 *         description: 标签创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 标签ID
 *                     name:
 *                       type: string
 *                       description: 标签名称
 *                     description:
 *                       type: string
 *                       description: 标签描述
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/config/business-pricing:
 *   get:
 *     summary: 获取商务报价配置
 *     description: 获取商务报价相关的配置信息
 *     tags: [配置管理]
 *     responses:
 *       200:
 *         description: 成功获取商务报价配置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: 商务报价配置
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: 更新商务报价配置
 *     description: 更新商务报价相关的配置信息
 *     tags: [配置管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 商务报价配置
 *     responses:
 *       200:
 *         description: 配置更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: 更新后的配置
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */