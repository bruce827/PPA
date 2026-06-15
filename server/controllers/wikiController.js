const wikiService = require('../services/wikiService');

/**
 * 获取 Wiki 目录树控制器
 */
exports.getWikiTree = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const forceRefresh = req.query.refresh === 'true';
    const project = req.query.project;
    const { tree, projects, currentProject } = await wikiService.getWikiTree(project, forceRefresh);
    const durationMs = Date.now() - startedAt;
    console.log('Wiki tree retrieved successfully', { durationMs, project: currentProject });
    
    res.json({
      success: true,
      data: tree,
      projects,
      currentProject
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('Failed to retrieve wiki tree', {
      error: error.message,
      code: error.code,
      durationMs
    });

    if (error.code === 'ENOENT' || error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: error.message || 'Wiki directory or index not found'
      });
    }
    
    next(error);
  }
};

/**
 * 获取特定 Wiki 文档正文控制器
 */
exports.getWikiContent = async (req, res, next) => {
  const startedAt = Date.now();
  const filePathRelative = req.query.path;
  const forceRefresh = req.query.refresh === 'true';

  try {
    const data = await wikiService.getWikiContent(filePathRelative, forceRefresh);
    const durationMs = Date.now() - startedAt;
    console.log('Wiki content retrieved successfully', { path: filePathRelative, durationMs });
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('Failed to retrieve wiki content', {
      path: filePathRelative,
      error: error.message,
      code: error.code,
      durationMs
    });

    if (error.code === 'EACCES' || error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    if (error.code === 'ENOENT' || error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: 'WIKI_FILE_NOT_FOUND',
        message: 'WIKI_FILE_NOT_FOUND: Wiki file not found'
      });
    }
    
    next(error);
  }
};

/**
 * 获取 Wiki 与项目绑定关系控制器
 */
exports.getWikiRelations = async (req, res, next) => {
  const startedAt = Date.now();
  const { wiki_key, project_id } = req.query;

  try {
    const data = await wikiService.getWikiRelations({ wiki_key, project_id });
    const durationMs = Date.now() - startedAt;
    console.log('Wiki relations retrieved successfully', { wiki_key, project_id, durationMs });
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('Failed to retrieve wiki relations', {
      wiki_key,
      project_id,
      error: error.message,
      durationMs
    });
    
    next(error);
  }
};

/**
 * 覆盖保存 Wiki 与项目绑定关系控制器
 */
exports.saveWikiRelations = async (req, res, next) => {
  const startedAt = Date.now();

  try {
    await wikiService.saveWikiRelations(req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Wiki relations saved successfully', { durationMs });
    
    res.json({
      success: true
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('Failed to save wiki relations', {
      error: error.message,
      durationMs
    });
    
    next(error);
  }
};
