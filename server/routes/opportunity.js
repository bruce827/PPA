const express = require('express');

const opportunityController = require('../controllers/opportunityController');
const tenderStagingController = require('../controllers/tenderStagingController');

const router = express.Router();

router.get('/bidding-sites', opportunityController.getBiddingSites);
router.get('/bidding-sites/:id', opportunityController.getBiddingSiteById);
router.post('/bidding-sites', opportunityController.createBiddingSite);
router.put('/bidding-sites/:id', opportunityController.updateBiddingSite);
router.delete('/bidding-sites/:id', opportunityController.deleteBiddingSite);
router.post('/bidding-sites/:id/validate', opportunityController.validateBiddingSite);
router.get('/tender-staging', tenderStagingController.listTenderStaging);
router.post('/tender-staging/sync', tenderStagingController.syncTenderStaging);
router.post('/tender-staging/:id/push', tenderStagingController.pushTenderStaging);

module.exports = router;
