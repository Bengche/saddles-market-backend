const express = require('express');
const router = express.Router();
const { subscribe, unsubscribe, confirmSubscription, sendCampaign, getSubscribers } = require('../controllers/newsletterController');
const { adminOnly } = require('../middleware/admin');
const { newsletterLimiter } = require('../middleware/rateLimiter');

router.post('/subscribe', newsletterLimiter, subscribe);
router.get('/unsubscribe/:token', unsubscribe);
router.get('/confirm/:token', confirmSubscription);
router.post('/campaign', adminOnly, sendCampaign);
router.get('/subscribers', adminOnly, getSubscribers);

module.exports = router;
