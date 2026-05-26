const express = require('express');
const router = express.Router();
const { placeOrder, getUserOrders, getOrder, requestRefund, adminGetOrders, adminUpdateOrderStatus } = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.post('/', optionalAuth, placeOrder);
router.get('/my', protect, getUserOrders);
router.get('/admin', adminOnly, adminGetOrders);
router.get('/:id', protect, getOrder);
router.post('/:id/refund', protect, requestRefund);
router.patch('/:id/status', adminOnly, adminUpdateOrderStatus);

module.exports = router;
