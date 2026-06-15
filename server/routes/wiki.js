const express = require('express');
const router = express.Router();
const path = require('path');
const wikiController = require('../controllers/wikiController');

// 静态托管 wiki 目录下的图片和附件（挂载在 /api/wiki/images 下）
router.use('/images', express.static(path.resolve(__dirname, '../wiki')));

// 获取 Wiki 目录树
router.get('/', wikiController.getWikiTree);

// 获取 Wiki 文档内容
router.get('/content', wikiController.getWikiContent);

// 获取 Wiki 与项目关联关系
router.get('/relations', wikiController.getWikiRelations);

// 保存 Wiki 与项目关联关系
router.post('/relations', wikiController.saveWikiRelations);

module.exports = router;
