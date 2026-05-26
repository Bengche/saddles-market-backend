const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect } = require('../middleware/auth');

router.post('/', protect, async (req, res, next) => {
  try {
    const { productId, rating, title, body } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    // Check if user purchased this product
    const purchase = await pool.query(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
       LIMIT 1`,
      [req.user.id, productId]
    );

    const isVerified = purchase.rows.length > 0;

    await pool.query(
      `INSERT INTO product_reviews (product_id, user_id, rating, title, body, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id, user_id) DO UPDATE
       SET rating = $3, title = $4, body = $5, is_verified = $6, is_approved = FALSE`,
      [productId, req.user.id, rating, title || null, body, isVerified]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted. It will be visible after approval.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/product/:productId', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, u.first_name, u.last_name
       FROM product_reviews pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.product_id = $1 AND pr.is_approved = TRUE
       ORDER BY pr.created_at DESC`,
      [req.params.productId]
    );

    res.json({ success: true, data: { reviews: result.rows } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
