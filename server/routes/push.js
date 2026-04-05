const express = require('express');
const router = express.Router();
const {
  validatePushHandler,
  pushProject,
  getPushHistory,
} = require('../controllers/pushController');

router.post('/:id/push/validate', validatePushHandler);
router.post('/:id/push', pushProject);
router.get('/:id/push-history', getPushHistory);

module.exports = router;
