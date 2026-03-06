const express = require('express');
const router = express.Router();
const contractsController = require('../controllers/contractsController');

router.get('/files', contractsController.listFiles);
router.get('/file', contractsController.readFile);
router.post('/recommend', contractsController.recommend);

module.exports = router;
