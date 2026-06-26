/**
 * 项目管理路由 Swagger 注释示例
 * 
 * 本文件展示如何为项目管理相关的API添加Swagger注释
 * 实际使用时，应将这些注释添加到 projects.js 路由文件中
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const exportController = require('../controllers/exportController');

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: 获取所有项目
 *     description: |
 *       获取系统中所有项目列表（不包括模板）。
 *       支持分页和筛选参数。
 *       返回项目基本信息和评估摘要。
 *     tags: [项目管理]
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
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词（项目名称或描述）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, all]
 *           default: active
 *         description: 项目状态筛选
 *     responses:
 *       200:
 *         description: 成功获取项目列表
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
 *                         $ref: '#/components/schemas/Project'
 *                     total:
 *                       type: integer
 *                       description: 总数量
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       description: 每页数量
 *                       example: 10
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: 创建新项目
 *     description: |
 *       创建一个新的评估项目。
 *       可以从空白项目开始，也可以基于模板创建。
 *       创建成功后返回完整的项目信息。
 *     tags: [项目管理]
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
 *                 description: 项目名称
 *                 example: "电商平台开发项目"
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 description: 项目描述
 *                 example: "开发一个全新的电商平台，包含前端、后端和移动端"
 *                 maxLength: 500
 *               is_template:
 *                 type: boolean
 *                 description: 是否为模板（默认false）
 *                 example: false
 *               template_id:
 *                 type: integer
 *                 description: 基于的模板ID（可选）
 *                 example: null
 *               assessment_details_json:
 *                 type: object
 *                 description: 评估详情JSON（可选，用于从模板复制）
 *     responses:
 *       201:
 *         description: 项目创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_name:
 *                 summary: 缺少项目名称
 *                 value:
 *                   success: false
 *                   error: "项目名称不能为空"
 *               duplicate_name:
 *                 summary: 项目名称重复
 *                 value:
 *                   success: false
 *                   error: "已存在同名项目"
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: 获取项目详情
 *     description: |
 *       获取指定ID的项目完整信息。
 *       包含项目基本信息、评估详情、计算结果等。
 *       返回的数据可用于编辑页面回显。
 *     tags: [项目管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 成功获取项目详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Project'
 *                     - type: object
 *                       properties:
 *                         assessment_details_json:
 *                           type: object
 *                           description: 完整的评估详情
 *                           properties:
 *                             risk_scores:
 *                               type: object
 *                               description: 风险评分
 *                             roles:
 *                               type: array
 *                               description: 角色配置
 *                             development_workload:
 *                               type: array
 *                               description: 开发工作量
 *                             integration_workload:
 *                               type: array
 *                               description: 集成工作量
 *                             calculation_snapshot:
 *                               type: object
 *                               description: 计算结果快照
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "项目不存在"
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: 更新项目
 *     description: |
 *       更新指定ID的项目信息。
 *       可以更新项目基本信息和评估详情。
 *       更新成功后返回完整的项目信息。
 *     tags: [项目管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 项目名称
 *                 example: "电商平台开发项目（已更新）"
 *               description:
 *                 type: string
 *                 description: 项目描述
 *                 example: "更新后的项目描述"
 *               assessment_details_json:
 *                 type: object
 *                 description: 评估详情JSON
 *     responses:
 *       200:
 *         description: 项目更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: 项目不存在
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
 *     summary: 删除项目
 *     description: |
 *       删除指定ID的项目。
 *       删除操作不可逆，请谨慎操作。
 *       删除后相关的附件和导出记录也会被清除。
 *     tags: [项目管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 项目删除成功
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
 *                       example: "项目删除成功"
 *                     deleted_id:
 *                       type: integer
 *                       example: 1
 *       404:
 *         description: 项目不存在
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
 * /api/templates:
 *   get:
 *     summary: 获取所有模板
 *     description: |
 *       获取系统中所有项目模板列表。
 *       模板可以用于快速创建新项目。
 *       返回模板基本信息和评估配置。
 *     tags: [项目管理]
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
 *         name: keyword
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
 *                         $ref: '#/components/schemas/Project'
 *                     total:
 *                       type: integer
 *                       description: 总数量
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/projects/{id}/export/pdf:
 *   get:
 *     summary: 导出PDF报告
 *     description: |
 *       导出项目评估报告为PDF格式。
 *       
 *       ⚠️ **注意**: 此功能当前已被废弃，仅保留基础导出功能。
 *       PDF内容仅包含项目名称、描述和三个汇总数字。
 *       如需完整报告，请使用Excel导出。
 *       
 *       @deprecated 此API将在未来版本中移除
 *     tags: [数据导出]
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *     responses:
 *       200:
 *         description: PDF文件下载
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 导出失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/projects/{id}/export/excel:
 *   get:
 *     summary: 导出Excel报告
 *     description: |
 *       导出项目评估报告为Excel格式。
 *       
 *       **版本选项:**\n
 *       - `internal`: 内部版本，包含6个工作表，详细的成本分解、风险评估、工作量分析等
 *       - `external`: 外部版本，包含2个工作表，仅项目摘要和汇总数据
 *       
 *       导出的文件包含完整的评估数据和计算结果。
 *     tags: [数据导出]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *           enum: [internal, external]
 *           default: internal
 *         description: |
 *           导出版本
 *           - `internal`: 内部版本（6个工作表）
 *           - `external`: 外部版本（2个工作表）
 *     responses:
 *       200:
 *         description: Excel文件下载
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 项目不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 导出失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/projects/{id}/business-quote:
 *   get:
 *     summary: 获取商务报价
 *     description: |
 *       获取指定项目的商务报价信息。
 *       包含报价金额、报价说明、有效期等信息。
 *     tags: [项目管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 成功获取商务报价
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
 *                     project_id:
 *                       type: integer
 *                       description: 项目ID
 *                       example: 1
 *                     quote_amount:
 *                       type: number
 *                       description: 报价金额（万元）
 *                       example: 25.5
 *                     quote_description:
 *                       type: string
 *                       description: 报价说明
 *                       example: "包含开发、测试和部署服务"
 *                     valid_until:
 *                       type: string
 *                       format: date
 *                       description: 报价有效期
 *                       example: "2024-12-31"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *       404:
 *         description: 项目不存在
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
 *   post:
 *     summary: 保存商务报价
 *     description: |
 *       保存或更新指定项目的商务报价信息。
 *       如果项目已有报价，则更新现有报价。
 *     tags: [项目管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quote_amount
 *             properties:
 *               quote_amount:
 *                 type: number
 *                 description: 报价金额（万元）
 *                 example: 25.5
 *               quote_description:
 *                 type: string
 *                 description: 报价说明
 *                 example: "包含开发、测试和部署服务"
 *               valid_until:
 *                 type: string
 *                 format: date
 *                 description: 报价有效期
 *                 example: "2024-12-31"
 *     responses:
 *       200:
 *         description: 商务报价保存成功
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
 *                     project_id:
 *                       type: integer
 *                       description: 项目ID
 *                     quote_amount:
 *                       type: number
 *                       description: 报价金额
 *                     quote_description:
 *                       type: string
 *                       description: 报价说明
 *                     valid_until:
 *                       type: string
 *                       format: date
 *                       description: 报价有效期
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 项目不存在
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

// 模板路由
router.get('/templates', projectController.getAllTemplates);

// 导出路由
router.get('/:id/export/pdf', exportController.exportPDF);
router.get('/:id/export/excel', exportController.exportExcel);
router.get('/:id/business-quote', projectController.getBusinessQuote);
router.post('/:id/business-quote', projectController.saveBusinessQuote);

// 项目 CRUD 路由
router.get('/:id', projectController.getProjectById);
router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;