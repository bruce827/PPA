/**
 * 表单设计控制器
 * 处理 HTTP 请求，提取参数，调用 Service 层，格式化响应
 */

const formDesignService = require('../services/formDesignService');

/**
 * 校验路由参数中的 ID 是否为正整数
 * @param {string} id - 路由参数
 * @param {string} name - 参数名称（用于错误信息）
 * @returns {number} 解析后的整数
 * @throws {Error} 如果不是正整数
 */
function parseId(id, name = 'id') {
  const num = parseInt(id, 10);
  if (isNaN(num) || num <= 0) {
    const err = new Error(`${name} 必须是正整数，当前值: ${id}`);
    err.statusCode = 400;
    throw err;
  }
  return num;
}

// ========== 统计 ==========

exports.getStats = async (req, res, next) => {
  try {
    const stats = await formDesignService.getStats();
    res.json({ code: 200, data: stats });
  } catch (err) {
    next(err);
  }
};

// ========== 校验 ==========

exports.validateField = async (req, res, next) => {
  try {
    const result = formDesignService.validateField(req.body);
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
};

exports.validateForm = async (req, res, next) => {
  try {
    const result = await formDesignService.validateForm(parseId(req.params.formId, '表单ID'));
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
};

// ========== 设计项目 CRUD ==========

exports.getAllProjects = async (req, res, next) => {
  try {
    const projects = await formDesignService.getAllProjects();
    res.json({ code: 200, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id, '项目ID');
    const project = await formDesignService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }
    res.json({ code: 200, data: project });
  } catch (err) {
    next(err);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { project_name, project_desc, linked_project_id } = req.body;
    if (!project_name) {
      return res.status(400).json({ code: 400, message: '项目名称不能为空' });
    }
    const project = await formDesignService.createProject({
      project_name,
      project_desc,
      linked_project_id
    });
    res.json({ code: 200, data: project });
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const { project_name, project_desc, linked_project_id } = req.body;
    if (!project_name) {
      return res.status(400).json({ code: 400, message: '项目名称不能为空' });
    }
    const project = await formDesignService.updateProject(parseId(req.params.id, '项目ID'), {
      project_name,
      project_desc,
      linked_project_id
    });
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }
    res.json({ code: 200, data: project });
  } catch (err) {
    next(err);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    await formDesignService.deleteProject(parseId(req.params.id, '项目ID'));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    next(err);
  }
};

// ========== 应用 CRUD ==========

exports.getAppsByProjectId = async (req, res, next) => {
  try {
    const apps = await formDesignService.getAppsByProjectId(parseId(req.params.projectId, '项目ID'));
    res.json({ code: 200, data: apps });
  } catch (err) {
    next(err);
  }
};

exports.createApp = async (req, res, next) => {
  try {
    const { app_name, app_code, project_id, description } = req.body;
    if (!app_name || !app_code) {
      return res.status(400).json({ code: 400, message: '应用名称和编码不能为空' });
    }
    const app = await formDesignService.createApp({
      app_name,
      app_code,
      project_id,
      description
    });
    res.json({ code: 200, data: app });
  } catch (err) {
    next(err);
  }
};

exports.updateApp = async (req, res, next) => {
  try {
    const { app_name, app_code, project_id, description, sort_order } = req.body;
    if (!app_name || !app_code) {
      return res.status(400).json({ code: 400, message: '应用名称和编码不能为空' });
    }
    const app = await formDesignService.updateApp(parseId(req.params.id, '应用ID'), {
      app_name,
      app_code,
      project_id,
      description,
      sort_order
    });
    if (!app) {
      return res.status(404).json({ code: 404, message: '应用不存在' });
    }
    res.json({ code: 200, data: app });
  } catch (err) {
    next(err);
  }
};

exports.deleteApp = async (req, res, next) => {
  try {
    await formDesignService.deleteApp(parseId(req.params.id, '应用ID'));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    next(err);
  }
};

// ========== 表单 CRUD ==========

exports.getFormsByAppId = async (req, res, next) => {
  try {
    const forms = await formDesignService.getFormsByAppId(parseId(req.params.appId, '应用ID'));
    res.json({ code: 200, data: forms });
  } catch (err) {
    next(err);
  }
};

exports.createForm = async (req, res, next) => {
  try {
    const { app_id, form_name, form_code, filter_condition, description } = req.body;
    if (!app_id || !form_name || !form_code) {
      return res.status(400).json({ code: 400, message: '应用ID、表单名称和编码不能为空' });
    }
    const form = await formDesignService.createForm({
      app_id,
      form_name,
      form_code,
      filter_condition,
      description
    });
    res.json({ code: 200, data: form });
  } catch (err) {
    next(err);
  }
};

exports.updateForm = async (req, res, next) => {
  try {
    const { form_name, form_code, filter_condition, description, sort_order } = req.body;
    if (!form_name || !form_code) {
      return res.status(400).json({ code: 400, message: '表单名称和编码不能为空' });
    }
    const form = await formDesignService.updateForm(parseId(req.params.id, '表单ID'), {
      form_name,
      form_code,
      filter_condition,
      description,
      sort_order
    });
    if (!form) {
      return res.status(404).json({ code: 404, message: '表单不存在' });
    }
    res.json({ code: 200, data: form });
  } catch (err) {
    next(err);
  }
};

exports.deleteForm = async (req, res, next) => {
  try {
    await formDesignService.deleteForm(parseId(req.params.id, '表单ID'));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    next(err);
  }
};

// ========== 字段 CRUD ==========

exports.getFieldsByFormId = async (req, res, next) => {
  try {
    const fields = await formDesignService.getFieldsByFormId(parseId(req.params.formId, '表单ID'));
    res.json({ code: 200, data: fields });
  } catch (err) {
    next(err);
  }
};

exports.createField = async (req, res, next) => {
  try {
    const { form_id, field_name, field_code } = req.body;
    if (!form_id || !field_name || !field_code) {
      return res.status(400).json({ code: 400, message: '表单ID、字段名称和编码不能为空' });
    }
    const field = await formDesignService.createField(req.body);
    res.json({ code: 200, data: field });
  } catch (err) {
    next(err);
  }
};

exports.updateField = async (req, res, next) => {
  try {
    const field = await formDesignService.updateField(parseId(req.params.id, '字段ID'), req.body);
    if (!field) {
      return res.status(404).json({ code: 404, message: '字段不存在' });
    }
    res.json({ code: 200, data: field });
  } catch (err) {
    next(err);
  }
};

exports.deleteField = async (req, res, next) => {
  try {
    await formDesignService.deleteField(parseId(req.params.id, '字段ID'));
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    next(err);
  }
};

exports.batchUpdateFields = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ code: 400, message: '批量更新需要非空数组' });
    }
    if (req.body.length > 200) {
      return res.status(400).json({ code: 400, message: '批量更新最多支持 200 条记录' });
    }
    await formDesignService.batchUpdateFields(req.body);
    res.json({ code: 200, message: '批量更新成功' });
  } catch (err) {
    next(err);
  }
};
