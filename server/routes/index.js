const express = require('express');
const router = express.Router();

const healthRoutes = require('./health');
const configRoutes = require('./config');
const calculationRoutes = require('./calculation');
const projectRoutes = require('./projects');
const dashboardRoutes = require('./dashboard');
const aiRoutes = require('./ai');
const web3dRoutes = require('./web3d');
const monitoringRoutes = require('./monitoring');
const contractsRoutes = require('./contracts');
const opportunityRoutes = require('./opportunity');
const attachmentRoutes = require('./attachment');
const pushRoutes = require('./push');

// 挂载各模块路由
router.use('/api', healthRoutes);
router.use('/api/config', configRoutes);
router.use('/api/calculate', calculationRoutes);
router.use('/api/projects', projectRoutes);
router.use('/api/projects', attachmentRoutes); // 项目附件管理
router.use('/api/projects', pushRoutes); // 项目推送
router.use('/api/templates', projectRoutes); // 模板也使用 projects 路由
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/ai', aiRoutes);
router.use('/api/web3d', web3dRoutes);
router.use('/api/monitoring', monitoringRoutes);
router.use('/api/contracts', contractsRoutes);
router.use('/api/opportunity', opportunityRoutes);

module.exports = router;
