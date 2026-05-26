const express = require('express');
const router = express.Router();
const { sendContactMessage, getMessages, markRead } = require('../controllers/contactController');
const { adminOnly } = require('../middleware/admin');
const { contactLimiter } = require('../middleware/rateLimiter');

router.post('/', contactLimiter, sendContactMessage);
router.get('/', adminOnly, getMessages);
router.patch('/:id/read', adminOnly, markRead);

module.exports = router;
