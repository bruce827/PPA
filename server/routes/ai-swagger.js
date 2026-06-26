/**
 * AI集成路由 Swagger 注释示例
 * 
 * 本文件展示如何为AI相关的API添加Swagger注释
 * 实际使用时，应将这些注释添加到 ai.js 路由文件中
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * @swagger
 * /api/ai/prompts:
 *   get:
 *     summary: 获取AI提示词列表
 *     description: |
 *       获取系统中所有可用的AI提示词模板。
 *       可用于风险评估、模块分析、工作量评估等场景。
 *       返回提示词的基本信息和内容预览。
 *     tags: [AI集成]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [risk_analysis, module_analysis, workload_evaluation, project_tag]
 *         description: 按分类筛选
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否只返回启用的模板
 *     responses:
 *       200:
 *         description: 成功获取提示词列表
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
 *                     $ref: '#/components/schemas/PromptTemplate'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ai/module-prompts:
 *   get:
 *     summary: 获取模块分析提示词
 *     description: |
 *       获取用于模块梳理分析的提示词模板列表。
 *       这些提示词用于AI分析项目模块结构。
 *     tags: [AI集成]
 *     responses:
 *       200:
 *         description: 成功获取模块分析提示词
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
 *                     $ref: '#/components/schemas/PromptTemplate'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ai/workload-prompts:
 *   get:
 *     summary: 获取工作量评估提示词
 *     description: |
 *       获取用于工作量评估的提示词模板列表。
 *       这些提示词用于AI评估项目各角色的工作量。
 *     tags: [AI集成]
 *     responses:
 *       200:
 *         description: 成功获取工作量评估提示词
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
 *                     $ref: '#/components/schemas/PromptTemplate'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ai/project-tag-prompts:
 *   get:
 *     summary: 获取项目标签生成提示词
 *     description: |
 *       获取用于项目标签生成的提示词模板列表。
 *       这些提示词用于AI生成项目标签。
 *     tags: [AI集成]
 *     responses:
 *       200:
 *         description: 成功获取项目标签生成提示词
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
 *                     $ref: '#/components/schemas/PromptTemplate'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ai/assess-risk:
 *   post:
 *     summary: AI风险评估
 *     description: |
 *       使用AI分析项目文档，识别和评估潜在风险。
 *       
 *       **功能特点:**\n
 *       - 自动识别项目风险点
 *       - 为每个风险分配评分
 *       - 提供风险分析理由
 *       - 支持自定义提示词模板
 *       
 *       **使用场景:**\n
 *       - 项目立项阶段的风险预估
 *       - 评估报告的风险部分生成
 *       - 风险管理决策支持
 *       
 *       **注意事项:**\n
 *       - 文档内容最长5000字符
 *       - AI结果仅供参考，需人工审核
 *       - 响应时间取决于AI服务，可能需要几秒到几十秒
 *     tags: [AI集成]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 maxLength: 5000
 *                 description: |
 *                   项目文档内容。
 *                   包含项目背景、技术方案、团队情况等信息。
 *                   内容越详细，AI分析越准确。
 *                 example: |
 *                   项目名称：电商平台开发
 *                   项目背景：为公司开发全新的B2C电商平台
 *                   技术栈：React + Node.js + MySQL
 *                   团队规模：前端3人，后端3人，测试2人
 *                   项目周期：6个月
 *               promptId:
 *                 type: integer
 *                 description: |
 *                   提示词模板ID（可选）。
 *                   如果不指定，使用系统默认的风险评估提示词。
 *                 example: null
 *               variable_values:
 *                 type: object
 *                 description: |
 *                   模板变量值（可选）。
 *                   用于替换提示词模板中的变量。
 *                 example: {"project_type": "电商", "tech_stack": "React + Node.js"}
 *     responses:
 *       200:
 *         description: 风险评估成功
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
 *                     risks:
 *                       type: array
 *                       description: 识别出的风险列表
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: 风险名称
 *                             example: "技术风险"
 *                           score:
 *                             type: number
 *                             description: 风险评分（1-20）
 *                             example: 15
 *                           reasoning:
 *                             type: string
 *                             description: 风险分析理由
 *                             example: "项目采用新技术栈，团队缺乏相关经验"
 *                     summary:
 *                       type: string
 *                       description: 风险评估总结
 *                       example: "项目整体风险中等，主要风险在于技术实现和团队经验"
 *                     confidence:
 *                       type: number
 *                       description: 评估置信度（0-1）
 *                       example: 0.85
 *                     duration_ms:
 *                       type: number
 *                       description: 评估耗时（毫秒）
 *                       example: 3500
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_document:
 *                 summary: 缺少文档内容
 *                 value:
 *                   success: false
 *                   error: "文档内容不能为空"
 *               document_too_long:
 *                 summary: 文档内容过长
 *                 value:
 *                   success: false
 *                   error: "文档内容不能超过5000字符"
 *       500:
 *         description: AI服务异常
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ai_service_error:
 *                 summary: AI服务不可用
 *                 value:
 *                   success: false
 *                   error: "AI服务暂时不可用，请稍后重试"
 *               timeout:
 *                 summary: 请求超时
 *                 value:
 *                   success: false
 *                   error: "AI评估超时，请稍后重试"
 */

/**
 * @swagger
 * /api/ai/normalize-risk-names:
 *   post:
 *     summary: 风险名称标准化
 *     description: |
 *       将AI生成的风险名称映射到系统标准风险列表。
 *       
 *       **功能特点:**\n
 *       - 模糊匹配和语义相似度分析
 *       - 保持风险报告的一致性
 *       - 支持批量处理
 *       
 *       **使用场景:**\n
 *       - AI风险评估后的名称标准化
 *       - 手动输入风险名称的规范化
 *       - 历史数据的风险名称统一
 *     tags: [AI集成]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - risk_names
 *             properties:
 *               risk_names:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 需要标准化的风险名称列表
 *                 example: ["技术难度", "人员变动", "需求变更", "进度延迟"]
 *     responses:
 *       200:
 *         description: 标准化成功
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
 *                     mappings:
 *                       type: array
 *                       description: 名称映射结果
 *                       items:
 *                         type: object
 *                         properties:
 *                           original:
 *                             type: string
 *                             description: 原始名称
 *                             example: "技术难度"
 *                           normalized:
 *                             type: string
 *                             description: 标准化后的名称
 *                             example: "技术风险"
 *                           confidence:
 *                             type: number
 *                             description: 匹配置信度（0-1）
 *                             example: 0.92
 *                     unmapped:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 无法映射的名称列表
 *                       example: []
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
 * /api/ai/analyze-project-modules:
 *   post:
 *     summary: AI模块分析
 *     description: |
 *       使用AI分析项目文档，分解项目模块结构。
 *       
 *       **功能特点:**\n
 *       - 自动生成3级模块层次结构
 *       - 估算每个模块的复杂度
 *       - 提供置信度评分
 *       - 支持自定义分析维度
 *       
 *       **输出结构:**\n
 *       - Level 1: 主要功能模块
 *       - Level 2: 子功能模块
 *       - Level 3: 具体功能点
 *       
 *       **使用场景:**\n
 *       - 项目立项时的模块规划
 *       - 工作量估算的输入
 *       - 项目范围的可视化
 *     tags: [AI集成]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 maxLength: 5000
 *                 description: |
 *                   项目文档内容。
 *                   包含功能需求、技术架构、业务流程等信息。
 *                 example: |
 *                   电商平台功能需求：
 *                   1. 用户管理：注册、登录、个人信息管理
 *                   2. 商品管理：商品展示、搜索、分类
 *                   3. 购物车：添加、删除、修改数量
 *                   4. 订单管理：下单、支付、物流跟踪
 *                   5. 支付系统：多种支付方式、退款处理
 *               promptId:
 *                 type: integer
 *                 description: 提示词模板ID（可选）
 *               variable_values:
 *                 type: object
 *                 description: 模板变量值（可选）
 *     responses:
 *       200:
 *         description: 模块分析成功
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
 *                     modules:
 *                       type: array
 *                       description: 模块层次结构
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: 模块名称
 *                             example: "用户管理"
 *                           complexity:
 *                             type: string
 *                             enum: [low, medium, high]
 *                             description: 复杂度
 *                             example: "medium"
 *                           description:
 *                             type: string
 *                             description: 模块描述
 *                             example: "用户注册、登录和个人信息管理功能"
 *                           children:
 *                             type: array
 *                             description: 子模块
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: "用户注册"
 *                                 complexity:
 *                                   type: string
 *                                   example: "low"
 *                                 description:
 *                                   type: string
 *                                   example: "新用户注册功能"
 *                     summary:
 *                       type: string
 *                       description: 分析总结
 *                       example: "项目包含5个主要模块，20个子模块"
 *                     confidence:
 *                       type: number
 *                       description: 分析置信度（0-1）
 *                       example: 0.88
 *                     duration_ms:
 *                       type: number
 *                       description: 分析耗时（毫秒）
 *                       example: 4200
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: AI服务异常
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ai/evaluate-workload:
 *   post:
 *     summary: AI工作量评估
 *     description: |
 *       使用AI评估项目各角色的工作量。
 *       
 *       **功能特点:**\n
 *       - 按角色估算工作量（人天）
 *       - 计算交付因子
 *       - 考虑项目复杂度
 *       - 提供工作量分布建议
 *       
 *       **输出内容:**\n
 *       - 各角色的工作量估算
 *       - 交付因子建议
 *       - 工作量分布比例
 *       - 总体工作量评估
 *       
 *       **使用场景:**\n
 *       - 项目报价的工作量估算
 *       - 人力资源规划
 *       - 项目进度规划
 *     tags: [AI集成]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 maxLength: 5000
 *                 description: |
 *                   项目文档内容。
 *                   包含功能需求、技术方案、团队配置等信息。
 *                 example: |
 *                   项目名称：电商平台开发
 *                   团队配置：前端3人，后端3人，测试2人，UI设计师1人
 *                   技术栈：React + Node.js + MySQL
 *                   项目周期：6个月
 *               promptId:
 *                 type: integer
 *                 description: 提示词模板ID（可选）
 *               variable_values:
 *                 type: object
 *                 description: 模板变量值（可选）
 *     responses:
 *       200:
 *         description: 工作量评估成功
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
 *                       description: 各角色工作量评估
 *                       items:
 *                         type: object
 *                         properties:
 *                           role_name:
 *                             type: string
 *                             description: 角色名称
 *                             example: "前端工程师"
 *                           workload_days:
 *                             type: number
 *                             description: 工作量（人天）
 *                             example: 120
 *                           delivery_factor:
 *                             type: number
 *                             description: 交付因子（0.8-1.5）
 *                             example: 1.0
 *                           reasoning:
 *                             type: string
 *                             description: 评估理由
 *                             example: "包含3个主要页面和多个交互组件"
 *                     total_workload_days:
 *                       type: number
 *                       description: 总工作量（人天）
 *                       example: 480
 *                     summary:
 *                       type: string
 *                       description: 评估总结
 *                       example: "项目总工作量约480人天，建议6人团队6个月完成"
 *                     confidence:
 *                       type: number
 *                       description: 评估置信度（0-1）
 *                       example: 0.82
 *                     duration_ms:
 *                       type: number
 *                       description: 评估耗时（毫秒）
 *                       example: 5100
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: AI服务异常
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ai/generate-project-tags:
 *   post:
 *     summary: AI生成项目标签
 *     description: |
 *       使用AI分析项目文档，生成项目标签。
 *       
 *       **功能特点:**\n
 *       - 自动提取项目关键词
 *       - 生成分类标签
 *       - 支持标签优先级排序
 *       - 标签数量可控
 *       
 *       **使用场景:**\n
 *       - 项目分类和检索
 *       - 项目特征提取
 *       - 项目相似度分析
 *     tags: [AI集成]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 maxLength: 5000
 *                 description: 项目文档内容
 *               promptId:
 *                 type: integer
 *                 description: 提示词模板ID（可选）
 *               variable_values:
 *                 type: object
 *                 description: 模板变量值（可选）
 *     responses:
 *       200:
 *         description: 标签生成成功
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
 *                     tags:
 *                       type: array
 *                       description: 生成的标签列表
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: 标签名称
 *                             example: "电商"
 *                           category:
 *                             type: string
 *                             description: 标签分类
 *                             example: "行业"
 *                           confidence:
 *                             type: number
 *                             description: 置信度（0-1）
 *                             example: 0.95
 *                     summary:
 *                       type: string
 *                       description: 生成总结
 *                       example: "共生成5个项目标签"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: AI服务异常
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// 提示词路由
router.get('/prompts', aiController.getPrompts);
router.get('/module-prompts', aiController.getModulePrompts);
router.get('/workload-prompts', aiController.getWorkloadPrompts);
router.get('/project-tag-prompts', aiController.getProjectTagPrompts);

// AI功能路由
router.post('/assess-risk', aiController.assessRisk);
router.post('/normalize-risk-names', aiController.normalizeRiskNames);
router.post('/analyze-project-modules', aiController.analyzeProjectModules);
router.post('/evaluate-workload', aiController.evaluateWorkload);
router.post('/generate-project-tags', aiController.generateProjectTags);

module.exports = router;