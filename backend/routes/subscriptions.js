const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

const subscriptionController = ServiceFactory.createSubscriptionController();

router.use(authenticateUser);

router.get('/current', (req, res, next) => {
  subscriptionController.getCurrentSubscription(req, res, next);
});

module.exports = router;
