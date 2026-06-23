const fs = require('fs').promises;
const path = require('path');
const wikiModel = require('../models/wikiModel');

const wikiTreeCacheMap = new Map();
const CACHE_TTL = 10000; // 10秒缓存

/**
 * 递归扫描目录下的所有 .md 文件
 * @param {string} dir 当前目录路径
 * @param {string} baseDir 根目录路径，用于计算相对路径
 * @returns {Promise<string[]>} 相对路径列表
 */
async function scanMdFiles(dir, baseDir) {
  const results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const file of list) {
    const resPath = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      const subResults = await scanMdFiles(resPath, baseDir);
      results.push(...subResults);
    } else if (file.isFile() && file.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, resPath).replace(/\\/g, '/');
      if (relativePath !== 'INDEX.md') {
        results.push(relativePath);
      }
    }
  }
  return results;
}

/**
 * 判断路径是否存在
 * @param {string} p 路径
 * @returns {Promise<boolean>}
 */
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取所有 Wiki 项目文件夹列表
 * @returns {Promise<string[]>}
 */
async function getProjectsList() {
  const wikiRoot = path.resolve(__dirname, '../wiki');
  try {
    const list = await fs.readdir(wikiRoot, { withFileTypes: true });
    return list
      .filter(item => item.isDirectory() && !item.name.startsWith('.') && item.name !== 'backups')
      .map(item => item.name)
      .sort();
  } catch (error) {
    console.error('[Wiki Service] Failed to read wiki root directory:', error);
    return [];
  }
}

/**
 * 获取 Wiki 目录树
 * @param {string} project 项目名称（可选）
 * @param {boolean} forceRefresh 是否强制刷新缓存
 * @returns {Promise<Object>}
 */
async function getWikiTree(project, forceRefresh = false) {
  const now = Date.now();
  const projects = await getProjectsList();
  
  if (projects.length === 0) {
    const error = new Error('No Wiki projects found');
    error.code = 'ENOENT';
    error.statusCode = 404;
    throw error;
  }

  // 确定当前使用的项目，如果传入的不在项目列表中，默认使用第一个项目
  let currentProject = project;
  if (!currentProject || !projects.includes(currentProject)) {
    currentProject = projects[0];
  }

  // 检查缓存
  if (!forceRefresh && wikiTreeCacheMap.has(currentProject)) {
    const cached = wikiTreeCacheMap.get(currentProject);
    if (now - cached.timestamp < CACHE_TTL) {
      return {
        tree: cached.data,
        projects,
        currentProject
      };
    }
  }

  const wikiRoot = path.resolve(__dirname, '../wiki');
  const projectDir = path.resolve(wikiRoot, currentProject);

  // 检查项目目录是否存在
  const projectDirExists = await exists(projectDir);
  if (!projectDirExists) {
    const error = new Error(`Wiki project directory '${currentProject}' not found`);
    error.code = 'ENOENT';
    error.statusCode = 404;
    throw error;
  }

  const indexPath = path.join(projectDir, 'INDEX.md');
  let indexItems = [];

  // 1. 尝试解析该项目下的 INDEX.md
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    // 匹配格式: - [标题](链接) — 描述
    const regex = /-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*—\s*(.*))?/;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const relativeLink = match[2].trim().replace(/\\/g, '/');
        // wiki_key 以 "项目名/相对链接" 形式表示
        const wikiKey = `${currentProject}/${relativeLink}`;
        indexItems.push({
          wiki_key: wikiKey,
          title: match[1].trim(),
          desc: match[3] ? match[3].trim() : '',
          inIndex: true
        });
      }
    }
  } catch (error) {
    // 仅容忍 INDEX.md 物理文件缺失 (ENOENT)
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // 2. 递归扫描该项目目录下的所有 md 文件
  let physicalFiles = [];
  try {
    physicalFiles = await scanMdFiles(projectDir, projectDir);
  } catch (error) {
    console.error(`[Wiki Service] Failed to scan physical directory for project '${currentProject}':`, error);
  }

  // 3. 合并去重并补齐未注册项目
  const registeredKeys = new Set(indexItems.map(item => item.wiki_key));
  for (const file of physicalFiles) {
    const fileWikiKey = `${currentProject}/${file}`;
    if (!registeredKeys.has(fileWikiKey)) {
      indexItems.push({
        wiki_key: fileWikiKey,
        title: path.basename(file, '.md'),
        desc: '',
        inIndex: false
      });
    }
  }

  // 写入缓存并返回
  wikiTreeCacheMap.set(currentProject, {
    data: indexItems,
    timestamp: now
  });

  return {
    tree: indexItems,
    projects,
    currentProject
  };
}

const wikiContentCache = new Map();
const CONTENT_CACHE_TTL = 10000; // 10秒内容缓存

/**
 * 获取特定 Wiki 正文内容（带正则语法兼容与安全校验）
 * @param {string} filePathRelative 相对路径
 * @param {boolean} forceRefresh 是否强刷缓存
 * @returns {Promise<Object>}
 */
async function getWikiContent(filePathRelative, forceRefresh = false) {
  const now = Date.now();
  
  if (!forceRefresh && wikiContentCache.has(filePathRelative)) {
    const cached = wikiContentCache.get(filePathRelative);
    if (now - cached.timestamp < CONTENT_CACHE_TTL) {
      return cached.data;
    }
  }

  const wikiRoot = path.resolve(__dirname, '../wiki');
  const safePath = path.resolve(wikiRoot, filePathRelative || '');

  // 1. 安全防御 Path Traversal
  const relative = path.relative(wikiRoot, safePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  if (!isSafe) {
    const error = new Error('Access denied');
    error.code = 'EACCES';
    error.statusCode = 403;
    throw error;
  }

  // 2. 读取物理文件并容错
  let rawContent = '';
  try {
    rawContent = await fs.readFile(safePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      const error = new Error('WIKI_FILE_NOT_FOUND');
      error.code = 'ENOENT';
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }

  // 3. 正则表达式语法转换
  const currentDir = path.dirname(filePathRelative).replace(/\\/g, '/');
  const dirPrefix = currentDir === '.' ? '' : currentDir + '/';

  // 3.1 替换 Obsidian 图片直嵌 ![[image.png]] -> ![image.png](/api/wiki/images/当前目录/image.png)
  let processed = rawContent.replace(/!\[\[([^\]]+)\]\]/g, (match, src) => {
    const cleanSrc = src.trim().replace(/\\/g, '/');
    return `![${cleanSrc}](/api/wiki/images/${dirPrefix}${cleanSrc})`;
  });

  // 3.2 替换带有显示别名的双链 [[Link|Text]] -> [Text](/form-design/wiki?key=当前目录/Link)
  processed = processed.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, link, text) => {
    const cleanLink = link.trim().replace(/\\/g, '/');
    const cleanText = text.trim();
    const linkWithoutMd = cleanLink.endsWith('.md') ? cleanLink.slice(0, -3) : cleanLink;
    return `[${cleanText}](/form-design/wiki?key=${dirPrefix}${linkWithoutMd})`;
  });

  // 3.3 替换标准双链 [[Link]] -> [Link](/form-design/wiki?key=当前目录/Link)
  processed = processed.replace(/\[\[([^\]|]+)\]\]/g, (match, link) => {
    const cleanLink = link.trim().replace(/\\/g, '/');
    const linkWithoutMd = cleanLink.endsWith('.md') ? cleanLink.slice(0, -3) : cleanLink;
    return `[${cleanLink}](/form-design/wiki?key=${dirPrefix}${linkWithoutMd})`;
  });

  // 3.4 替换标准图片 Markdown ![](image.png) -> ![]( /api/wiki/images/当前目录/image.png )
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const cleanSrc = src.trim().replace(/\\/g, '/');
    if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://') || cleanSrc.startsWith('/')) {
      return match;
    }
    const normalizedSrc = cleanSrc.replace(/^\.\//, '');
    return `![${alt}]( /api/wiki/images/${dirPrefix}${normalizedSrc} )`;
  });

  const result = {
    key: filePathRelative.replace(/\\/g, '/'),
    content: processed
  };

  wikiContentCache.set(filePathRelative, {
    data: result,
    timestamp: now
  });

  return result;
}

/**
 * 查询 Wiki 与评估项目绑定关系
 * @param {Object} params 参数
 * @returns {Promise<any[]>}
 */
async function getWikiRelations(params = {}) {
  if (params.wiki_key) {
    return wikiModel.getProjectIdsByWikiKey(params.wiki_key);
  }
  if (params.project_id) {
    return wikiModel.getWikiKeysByProjectId(Number(params.project_id));
  }
  return [];
}

/**
 * 覆盖保存 Wiki 与项目关联关系
 * @param {Object} data 请求体
 * @returns {Promise<boolean>}
 */
async function saveWikiRelations(data = {}) {
  if (data.wiki_key !== undefined && data.project_ids !== undefined) {
    await wikiModel.saveProjectRelationsForWiki(data.wiki_key, data.project_ids);
    return true;
  }
  if (data.project_id !== undefined && data.wiki_keys !== undefined) {
    await wikiModel.saveWikiRelationsForProject(Number(data.project_id), data.wiki_keys);
    return true;
  }
  
  const error = new Error('Invalid relations payload. Must provide wiki_key and project_ids, or project_id and wiki_keys.');
  error.name = 'ValidationError';
  error.statusCode = 400;
  throw error;
}

module.exports = {
  getWikiTree,
  getWikiContent,
  getWikiRelations,
  saveWikiRelations,
  // 导出辅助函数以便测试
  scanMdFiles,
  exists
};
