const express = require('express');

const opportunityController = require('../controllers/opportunityController');
const tenderStagingController = require('../controllers/tenderStagingController');
const tenderWebSearchController = require('../controllers/tenderWebSearchController');

const router = express.Router();

router.get('/bidding-sites', opportunityController.getBiddingSites);
router.get('/bidding-sites/:id', opportunityController.getBiddingSiteById);
router.post('/bidding-sites', opportunityController.createBiddingSite);
router.put('/bidding-sites/:id', opportunityController.updateBiddingSite);
router.delete('/bidding-sites/:id', opportunityController.deleteBiddingSite);
router.post('/bidding-sites/:id/validate', opportunityController.validateBiddingSite);
router.get('/tender-staging', tenderStagingController.listTenderStaging);
router.get('/tender-staging/:id/web-search', tenderWebSearchController.getTenderWebSearch);
router.post('/tender-staging/:id/web-search', tenderWebSearchController.searchTenderWebSearch);
router.post('/tender-staging/sync', tenderStagingController.syncTenderStaging);
router.post('/tender-staging/:id/push', tenderStagingController.pushTenderStaging);

module.exports = router;
