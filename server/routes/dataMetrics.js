/**
 * 数据指标设计 - 路由定义
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const dataMetricsController = require('../controllers/dataMetricsController');

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .xlsx 格式'), false);
    }
  }
});

// 校验中间件
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array() });
  }
  next();
};

// ========== 项目 CRUD ==========

// 获取项目列表
router.get('/projects', dataMetricsController.getProjects);

// 获取单个项目
router.get('/projects/:id', [
  param('id').isInt().withMessage('id必须是整数'),
], validate, dataMetricsController.getProjectById);

// 创建项目
router.post('/projects', [
  body('project_name').notEmpty().withMessage('项目名称不能为空'),
], validate, dataMetricsController.createProject);

// 更新项目
router.put('/projects/:id', [
  param('id').isInt().withMessage('id必须是整数'),
  body('project_name').notEmpty().withMessage('项目名称不能为空'),
], validate, dataMetricsController.updateProject);

// 删除项目
router.delete('/projects/:id', [
  param('id').isInt().withMessage('id必须是整数'),
], validate, dataMetricsController.deleteProject);

// ========== 统计 ==========

router.get('/stats', dataMetricsController.getStats);

// ========== 筛选选项 ==========

router.get('/filter-options', dataMetricsController.getFilterOptions);

// ========== 历史项目 ==========

router.get('/linked-projects', dataMetricsController.getLinkedProjects);

// ========== 指标 CRUD ==========

// 获取指标列表
router.get('/', [
  query('dm_project_id').optional().isInt().withMessage('dm_project_id必须是整数'),
  query('module_name').optional().isString(),
  query('scene_l1').optional().isString(),
  query('scene_l2').optional().isString(),
  query('display_type').optional().isString(),
  query('keyword').optional().isString(),
  query('page').optional().isInt({ min: 1 }).withMessage('page必须是大于0的整数'),
  query('pageSize').optional().isInt({ min: 1, max: 10000 }).withMessage('pageSize必须是1-10000的整数'),
], validate, dataMetricsController.getList);

// 获取单个指标
router.get('/:id', [
  param('id').isInt().withMessage('id必须是整数'),
], validate, dataMetricsController.getById);

// 新增指标
router.post('/', [
  body('dm_project_id').isInt().withMessage('项目ID不能为空'),
  body('module_name').notEmpty().withMessage('功能模块不能为空'),
  body('scene_l1').notEmpty().withMessage('一级场景不能为空'),
  body('scene_l2').notEmpty().withMessage('二级场景不能为空'),
  body('metric_name').notEmpty().withMessage('指标名称不能为空'),
  body('display_type').notEmpty().withMessage('展示方式不能为空'),
], validate, dataMetricsController.create);

// 更新指标
router.put('/:id', [
  param('id').isInt().withMessage('id必须是整数'),
  body('module_name').optional().isString(),
  body('scene_l1').optional().isString(),
  body('scene_l2').optional().isString(),
  body('metric_name').optional().isString(),
  body('display_type').optional().isString(),
], validate, dataMetricsController.update);

// 删除指标
router.delete('/:id', [
  param('id').isInt().withMessage('id必须是整数'),
], validate, dataMetricsController.remove);

// 批量操作
router.post('/batch', [
  body('action').isIn(['delete', 'update']).withMessage('action必须是delete或update'),
  body('ids').isArray({ min: 1 }).withMessage('ids必须是非空数组'),
  body('ids.*').isInt().withMessage('ids中的每个元素必须是整数'),
], validate, dataMetricsController.batch);

// ========== Excel导入导出 ==========

// 导入预览
router.post('/import/preview', upload.single('file'), dataMetricsController.importPreview);

// 确认导入
router.post('/import', [
  body('dm_project_id').isInt().withMessage('项目ID不能为空'),
  body('mode').isIn(['append', 'overwrite']).withMessage('mode必须是append或overwrite'),
  body('data').isArray({ min: 1 }).withMessage('data必须是非空数组'),
], validate, dataMetricsController.importConfirm);

// 导出
router.get('/export', [
  query('dm_project_id').optional().isInt(),
  query('module_name').optional().isString(),
  query('scene_l1').optional().isString(),
  query('display_type').optional().isString(),
], validate, dataMetricsController.export);

// ========== 场景分类 ==========

// 获取分类树
router.get('/categories/tree', dataMetricsController.getCategoryTree);

// 新增分类
router.post('/categories', [
  body('dm_project_id').isInt().withMessage('项目ID不能为空'),
  body('type').isIn(['module', 'scene_l1', 'scene_l2']).withMessage('type必须是module、scene_l1或scene_l2'),
  body('name').notEmpty().withMessage('name不能为空'),
  body('parent_id').optional({ nullable: true }).isInt().withMessage('parent_id必须是整数'),
], validate, dataMetricsController.createCategory);

// 更新分类
router.put('/categories/:id', [
  param('id').isInt().withMessage('id必须是整数'),
  body('name').notEmpty().withMessage('name不能为空'),
], validate, dataMetricsController.updateCategory);

// 删除分类
router.delete('/categories/:id', [
  param('id').isInt().withMessage('id必须是整数'),
], validate, dataMetricsController.removeCategory);

// =========================================================================
// ========== Agent 接口安全网关与路由注册 (Antigravity 改造版) ==========
// =========================================================================

/**
 * 专供外部 Agent 的轻量级 API-Key 安全校验中间件
 */
const agentAuthMiddleware = (req, res, next) => {
  const agentApiKey = req.headers['x-agent-api-key'];
  const expectedKey = process.env.PPA_AGENT_SECRET_KEY || 'ppa_agent_secret_token_2026';
  
  if (!agentApiKey || agentApiKey !== expectedKey) {
    console.warn(`[Agent Gateway] Authorization Blocked! Remote: ${req.ip}`);
    return res.status(401).json({
      success: false,
      error_code: 'UNAUTHORIZED_AGENT_ACCESS',
      error: '外部 Agent 未授权。',
      hint: '请确保在 Request Headers 中正确配置 "X-Agent-API-Key" 参数。'
    });
  }
  next();
};

// 1. 获取极简紧凑的 Agent 绘制大纲 (支持 format=markdown/json，免分页)
router.get('/projects/:id/agent-context', agentAuthMiddleware, dataMetricsController.getAgentContext);

// 2. 获取推荐的大屏 12 栅格 Canvas 坐标 DSL
router.get('/projects/:id/agent-layout', agentAuthMiddleware, dataMetricsController.getAgentLayout);

// 3. 外部 Agent 回写排版布局与 3D 关联参数
router.post('/projects/:id/agent-feedback', agentAuthMiddleware, dataMetricsController.saveAgentFeedback);

// 4. 一键转化为 PPA 项目成本估算模板 (工时同步)
router.post('/projects/:id/convert-to-ppa-template', agentAuthMiddleware, dataMetricsController.convertToPpaTemplate);

// 5. 导出完整平铺指标的 JSON
router.get('/projects/:id/export/json', agentAuthMiddleware, dataMetricsController.exportToJson);

module.exports = router;
