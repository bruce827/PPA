/**
 * 表单设计路由
 * 只定义 URL 到 Controller 的映射，不包含业务逻辑
 */

const express = require('express');
const router = express.Router();
const formDesignController = require('../controllers/formDesignController');

// ========== 统计 ==========
router.get('/stats', formDesignController.getStats);

// ========== 校验 ==========
router.post('/validate/field', formDesignController.validateField);
router.get('/validate/form/:formId', formDesignController.validateForm);

// ========== 设计项目 CRUD ==========
router.get('/projects', formDesignController.getAllProjects);
router.get('/projects/:id', formDesignController.getProjectById);
router.post('/projects', formDesignController.createProject);
router.put('/projects/:id', formDesignController.updateProject);
router.delete('/projects/:id', formDesignController.deleteProject);

// ========== 应用 CRUD ==========
router.get('/projects/:projectId/apps', formDesignController.getAppsByProjectId);
router.post('/apps', formDesignController.createApp);
router.put('/apps/:id', formDesignController.updateApp);
router.delete('/apps/:id', formDesignController.deleteApp);

// ========== 表单 CRUD ==========
router.get('/apps/:appId/forms', formDesignController.getFormsByAppId);
router.post('/forms', formDesignController.createForm);
router.put('/forms/:id', formDesignController.updateForm);
router.delete('/forms/:id', formDesignController.deleteForm);

// ========== 字段 CRUD ==========
router.get('/forms/:formId/fields', formDesignController.getFieldsByFormId);
router.post('/fields', formDesignController.createField);
router.put('/fields/:id', formDesignController.updateField);
router.delete('/fields/:id', formDesignController.deleteField);
router.post('/fields/batch', formDesignController.batchUpdateFields);

module.exports = router;
