const contractsService = require('../services/contractsService');
const { internalError } = require('../utils/errors');
const logger = require('../utils/logger');

async function listFiles(req, res, next) {
  const startedAt = Date.now();
  try {
    const files = await contractsService.listContractFiles();
    const durationMs = Date.now() - startedAt;
    try {
      logger.info('Contracts 文件列表查询成功', {
        route: 'GET /api/contracts/files',
        count: files.length,
        durationMs,
      });
    } catch (e) {}
    res.json({ success: true, data: { files } });
  } catch (error) {
    try {
      logger.error('Contracts 文件列表查询失败', {
        route: 'GET /api/contracts/files',
        error: error.message,
      });
    } catch (e) {}
    next(error.statusCode ? error : internalError('获取 contracts 文件列表失败'));
  }
}

async function readFile(req, res, next) {
  const startedAt = Date.now();
  const { name, search, maxRows } = req.query || {};
  try {
    const data = await contractsService.readContractFile({
      name,
      search,
      maxRows: maxRows !== undefined ? Number(maxRows) : undefined,
    });
    const durationMs = Date.now() - startedAt;
    try {
      logger.info('Contracts 文件读取成功', {
        route: 'GET /api/contracts/file',
        name,
        durationMs,
        returnedRows: data?.meta?.returned_rows,
        matchedRows: data?.meta?.matched_rows,
      });
    } catch (e) {}
    res.json({ success: true, data });
  } catch (error) {
    try {
      logger.error('Contracts 文件读取失败', {
        route: 'GET /api/contracts/file',
        name,
        error: error.message,
        statusCode: error.statusCode || 500,
      });
    } catch (e) {}
    next(error.statusCode ? error : internalError('读取 contracts 文件失败'));
  }
}

async function recommend(req, res, next) {
  const startedAt = Date.now();
  const { tags, topN, maxRowsPerFile } = req.body || {};
  try {
    const data = await contractsService.recommendContracts({
      tags,
      topN,
      maxRowsPerFile,
    });
    const durationMs = Date.now() - startedAt;
    try {
      logger.info('Contracts 推荐成功', {
        route: 'POST /api/contracts/recommend',
        tagsCount: Array.isArray(tags) ? tags.length : 0,
        topN,
        durationMs,
        returned: Array.isArray(data?.items) ? data.items.length : 0,
      });
    } catch (e) {}
    res.json({ success: true, data });
  } catch (error) {
    try {
      logger.error('Contracts 推荐失败', {
        route: 'POST /api/contracts/recommend',
        error: error.message,
        statusCode: error.statusCode || 500,
      });
    } catch (e) {}
    next(error.statusCode ? error : internalError('获取相关业绩推荐失败'));
  }
}

module.exports = {
  listFiles,
  readFile,
  recommend,
};
