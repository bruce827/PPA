const express = require('express');

const opportunityController = require('../controllers/opportunityController');

const router = express.Router();

router.get('/bidding-sites', opportunityController.getBiddingSites);
router.get('/bidding-sites/:id', opportunityController.getBiddingSiteById);
router.post('/bidding-sites', opportunityController.createBiddingSite);
router.put('/bidding-sites/:id', opportunityController.updateBiddingSite);
router.delete('/bidding-sites/:id', opportunityController.deleteBiddingSite);
router.post('/bidding-sites/:id/validate', opportunityController.validateBiddingSite);

module.exports = router;
