const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const aiTestService = require('../services/aiTestService');

// 获取数据库连接
const getDatabase = () => {
  const dbPath = path.join(__dirname, '..', 'ppa.db');
  return new sqlite3.Database(dbPath);
};

// 将 db.all/get/run 转为 Promise
const dbAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

/**
 * 获取所有 AI 模型配置列表
 */
exports.getAIModels = async (req, res, next) => {
  const db = getDatabase();
  try {
    const models = await dbAll(
      db,
      'SELECT * FROM ai_model_configs ORDER BY is_current DESC, created_at DESC'
    );
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('获取 AI 模型配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取 AI 模型配置列表失败: ' + error.message
    });
  } finally {
    db.close();
  }
};

/**
 * 获取单个 AI 模型配置详情
 */
exports.getAIModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const model = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [id]
    );
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的 AI 模型配置'
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('获取 AI 模型配置详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取 AI 模型配置详情失败: ' + error.message
    });
  } finally {
    db.close();
  }
};

/**
 * 创建新的 AI 模型配置
 */
exports.createAIModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const {
      config_name,
      description,
      provider,
      api_key,
      api_host,
      model_name,
      temperature = 0.7,
      max_tokens = 2000,
      timeout = 30,
      is_current = 0,
      is_active = 1
    } = req.body;

    // 验证必填字段
    if (!config_name || !provider || !api_key || !api_host || !model_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：config_name, provider, api_key, api_host, model_name'
      });
    }

    // 如果设置为当前模型，先取消其他模型的 is_current
    if (is_current === 1) {
      await dbRun(db, 'UPDATE ai_model_configs SET is_current = 0');
    }

    const result = await dbRun(
      db,
      `INSERT INTO ai_model_configs 
       (config_name, description, provider, api_key, api_host, model_name, 
        temperature, max_tokens, timeout, is_current, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        config_name,
        description,
        provider,
        api_key,
        api_host,
        model_name,
        temperature,
        max_tokens,
        timeout,
        is_current,
        is_active
      ]
    );

    // 返回创建的记录
    const newModel = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      data: newModel,
      message: 'AI 模型配置创建成功'
    });
  } catch (error) {
    console.error('创建 AI 模型配置失败:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({
        success: false,
        message: '配置名称已存在，请使用不同的名称'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '创建 AI 模型配置失败: ' + error.message
      });
    }
  } finally {
    db.close();
  }
};

/**
 * 更新 AI 模型配置
 */
exports.updateAIModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const {
      config_name,
      description,
      provider,
      api_key,
      api_host,
      model_name,
      temperature,
      max_tokens,
      timeout,
      is_current,
      is_active
    } = req.body;

    // 检查配置是否存在
    const existingModel = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [id]
    );

    if (!existingModel) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的 AI 模型配置'
      });
    }

    // 如果设置为当前模型，先取消其他模型的 is_current
    if (is_current === 1) {
      await dbRun(db, 'UPDATE ai_model_configs SET is_current = 0 WHERE id != ?', [id]);
    }

    // 更新配置
    await dbRun(
      db,
      `UPDATE ai_model_configs 
       SET config_name = ?, description = ?, provider = ?, api_key = ?, 
           api_host = ?, model_name = ?, temperature = ?, max_tokens = ?, 
           timeout = ?, is_current = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        config_name,
        description,
        provider,
        api_key,
        api_host,
        model_name,
        temperature,
        max_tokens,
        timeout,
        is_current,
        is_active,
        id
      ]
    );

    // 返回更新后的记录
    const updatedModel = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updatedModel,
      message: 'AI 模型配置更新成功'
    });
  } catch (error) {
    console.error('更新 AI 模型配置失败:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({
        success: false,
        message: '配置名称已存在，请使用不同的名称'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '更新 AI 模型配置失败: ' + error.message
      });
    }
  } finally {
    db.close();
  }
};

/**
 * 删除 AI 模型配置
 */
exports.deleteAIModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const { id } = req.params;

    // 检查配置是否存在
    const model = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [id]
    );

    if (!model) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的 AI 模型配置'
      });
    }

    // 检查是否为当前使用的模型
    if (model.is_current === 1) {
      return res.status(400).json({
        success: false,
        message: '无法删除当前使用的模型，请先切换到其他模型'
      });
    }

    // 执行删除
    await dbRun(db, 'DELETE FROM ai_model_configs WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'AI 模型配置删除成功'
    });
  } catch (error) {
    console.error('删除 AI 模型配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除 AI 模型配置失败: ' + error.message
    });
  } finally {
    db.close();
  }
};

/**
 * 设置当前使用的模型
 */
exports.setCurrentModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const { id } = req.params;

    // 检查配置是否存在
    const model = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [id]
    );

    if (!model) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的 AI 模型配置'
      });
    }

    // 检查配置是否启用
    if (model.is_active === 0) {
      return res.status(400).json({
        success: false,
        message: '无法设置未启用的模型为当前使用'
      });
    }

    // 使用事务处理：将所有模型的 is_current 设为 0，然后设置目标模型为 1
    await dbRun(db, 'BEGIN TRANSACTION');
    
    try {
      // 取消所有模型的当前状态
      await dbRun(db, 'UPDATE ai_model_configs SET is_current = 0');
      
      // 设置目标模型为当前
      await dbRun(
        db,
        'UPDATE ai_model_configs SET is_current = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      await dbRun(db, 'COMMIT');
      
      // 返回更新后的记录
      const updatedModel = await dbGet(
        db,
        'SELECT * FROM ai_model_configs WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: updatedModel,
        message: `已成功将 "${model.config_name}" 设置为当前使用的模型`
      });
    } catch (transactionError) {
      await dbRun(db, 'ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('设置当前模型失败:', error);
    res.status(500).json({
      success: false,
      message: '设置当前模型失败: ' + error.message
    });
  } finally {
    db.close();
  }
};

/**
 * 获取当前使用的模型
 */
exports.getCurrentModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const currentModel = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE is_current = 1'
    );

    if (!currentModel) {
      return res.status(404).json({
        success: false,
        message: '当前没有设置使用的模型，请先配置并设置一个模型为当前使用'
      });
    }

    res.json({
      success: true,
      data: currentModel
    });
  } catch (error) {
    console.error('获取当前模型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取当前模型失败: ' + error.message
    });
  } finally {
    db.close();
  }
};

/**
 * 测试 AI 模型连接
 */
exports.testAIModel = async (req, res, next) => {
  const db = getDatabase();
  try {
    const { id } = req.params;

    // 获取配置
    const model = await dbGet(
      db,
      'SELECT * FROM ai_model_configs WHERE id = ?',
      [id]
    );

    if (!model) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的 AI 模型配置'
      });
    }

    // 调用测试服务进行连接测试
    const testResult = await aiTestService.testConnection(model);
    
    // 更新测试结果到数据库
    const testStatus = testResult.success ? 'success' : 'failed';
    await dbRun(
      db,
      `UPDATE ai_model_configs 
       SET last_test_time = CURRENT_TIMESTAMP, 
           test_status = ?
       WHERE id = ?`,
      [testStatus, id]
    );

    // 返回测试结果
    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'success',
          details: testResult.details
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'failed',
          error: testResult.error
        }
      });
    }
  } catch (error) {
    console.error('测试 AI 模型连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试连接失败: ' + error.message
    });
  } finally {
    db.close();
  }
};

/**
 * 临时测试 AI 模型连接（不保存到数据库）
 * 用于表单内测试当前填写的配置
 */
exports.testAIModelTemp = async (req, res, next) => {
  try {
    const { provider, api_key, api_host, model_name, timeout = 30 } = req.body;

    // 验证必填字段
    if (!provider || !api_key || !api_host || !model_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：provider, api_key, api_host, model_name'
      });
    }

    // 构造临时配置对象
    const tempConfig = {
      provider,
      api_key,
      api_host,
      model_name,
      timeout
    };

    // 调用测试服务
    const testResult = await aiTestService.testConnection(tempConfig);

    // 返回测试结果（不更新数据库）
    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'success',
          details: testResult.details
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'failed',
          error: testResult.error
        }
      });
    }
  } catch (error) {
    console.error('临时测试连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试连接失败: ' + error.message
    });
  }
};
