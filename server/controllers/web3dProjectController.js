const web3dProjectService = require('../services/web3dProjectService');
const exportService = require('../services/exportService');

exports.calculate = async (req, res, next) => {
  try {
    const calculation = await web3dProjectService.calculate(req.body.assessment || req.body);
    res.json({ data: calculation });
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const result = await web3dProjectService.createProject(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const result = await web3dProjectService.updateProject(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const project = await web3dProjectService.getProjectById(req.params.id);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
};

exports.getAllProjects = async (req, res, next) => {
  try {
    const projects = await web3dProjectService.getAllProjects();
    res.json({ data: projects });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const result = await web3dProjectService.deleteProject(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.exportProject = async (req, res, next) => {
  try {
    const project = await web3dProjectService.getProjectById(req.params.id);
    const { workbook, version } = await exportService.generateExcel(project, 'web3d');

    const safeName = encodeURIComponent(
      `${project.name || 'web3d_project'}_${version || 'web3d'}.xlsx`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
