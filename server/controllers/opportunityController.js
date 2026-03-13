const biddingSiteService = require('../services/biddingSiteService');

async function getBiddingSites(req, res, next) {
  try {
    const result = await biddingSiteService.listBiddingSites(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getBiddingSiteById(req, res, next) {
  try {
    const result = await biddingSiteService.getBiddingSiteById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createBiddingSite(req, res, next) {
  try {
    const result = await biddingSiteService.createBiddingSite(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function updateBiddingSite(req, res, next) {
  try {
    const result = await biddingSiteService.updateBiddingSite(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteBiddingSite(req, res, next) {
  try {
    const result = await biddingSiteService.deleteBiddingSite(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function validateBiddingSite(req, res, next) {
  try {
    const result = await biddingSiteService.validateBiddingSite(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBiddingSites,
  getBiddingSiteById,
  createBiddingSite,
  updateBiddingSite,
  deleteBiddingSite,
  validateBiddingSite,
};
