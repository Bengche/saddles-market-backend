const pool = require('../config/database');

// ─── Get Cart ──────────────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    let query, params;
    if (userId) {
      query = `SELECT ci.*, p.name, p.price, p.compare_price, p.stock_quantity,
                      p.seat_size, p.brand, p.slug, p.is_active,
                      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
               FROM cart_items ci
               JOIN products p ON p.id = ci.product_id
               WHERE ci.user_id = $1 AND p.is_active = TRUE`;
      params = [userId];
    } else if (sessionId) {
      query = `SELECT ci.*, p.name, p.price, p.compare_price, p.stock_quantity,
                      p.seat_size, p.brand, p.slug, p.is_active,
                      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
               FROM cart_items ci
               JOIN products p ON p.id = ci.product_id
               WHERE ci.session_id = $1 AND p.is_active = TRUE`;
      params = [sessionId];
    } else {
      return res.json({ success: true, data: { items: [], total: 0 } });
    }

    const result = await pool.query(query, params);
    const items = result.rows;

    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

    res.json({ success: true, data: { items, subtotal } });
  } catch (err) {
    next(err);
  }
};

// ─── Add to Cart ───────────────────────────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    if (!userId && !sessionId) {
      return res.status(400).json({ success: false, message: 'Session required.' });
    }

    // Verify product exists and is active
    const product = await pool.query(
      'SELECT id, stock_quantity FROM products WHERE id = $1 AND is_active = TRUE',
      [productId]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const existing = userId
      ? await pool.query(
          'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
          [userId, productId]
        )
      : await pool.query(
          'SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2',
          [sessionId, productId]
        );

    if (existing.rows.length > 0) {
      const newQty = Math.min(existing.rows[0].quantity + parseInt(quantity), 10);
      await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [
        newQty,
        existing.rows[0].id,
      ]);
    } else {
      if (userId) {
        await pool.query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [userId, productId, parseInt(quantity)]
        );
      } else {
        await pool.query(
          'INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1, $2, $3)',
          [sessionId, productId, parseInt(quantity)]
        );
      }
    }

    res.json({ success: true, message: 'Item added to cart.' });
  } catch (err) {
    next(err);
  }
};

// ─── Update Cart Item ──────────────────────────────────────────────────────────
const updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    if (parseInt(quantity) <= 0) {
      const condition = userId ? 'user_id = $2' : 'session_id = $2';
      const param = userId || sessionId;
      await pool.query(`DELETE FROM cart_items WHERE id = $1 AND ${condition}`, [id, param]);
    } else {
      const condition = userId ? 'user_id = $3' : 'session_id = $3';
      const param = userId || sessionId;
      await pool.query(
        `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND ${condition}`,
        [Math.min(parseInt(quantity), 10), id, param]
      );
    }

    res.json({ success: true, message: 'Cart updated.' });
  } catch (err) {
    next(err);
  }
};

// ─── Remove from Cart ──────────────────────────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    const condition = userId ? 'user_id = $2' : 'session_id = $2';
    const param = userId || sessionId;

    await pool.query(`DELETE FROM cart_items WHERE id = $1 AND ${condition}`, [id, param]);

    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    next(err);
  }
};

// ─── Clear Cart ────────────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    if (userId) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else if (sessionId) {
      await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
    }

    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    next(err);
  }
};

// ─── Merge Guest Cart on Login ─────────────────────────────────────────────────
const mergeCart = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.json({ success: true, message: 'No session cart to merge.' });
    }

    const guestItems = await pool.query(
      'SELECT * FROM cart_items WHERE session_id = $1',
      [sessionId]
    );

    for (const item of guestItems.rows) {
      const existing = await pool.query(
        'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, item.product_id]
      );

      if (existing.rows.length > 0) {
        const newQty = Math.min(existing.rows[0].quantity + item.quantity, 10);
        await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [
          newQty,
          existing.rows[0].id,
        ]);
      } else {
        await pool.query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [userId, item.product_id, item.quantity]
        );
      }
    }

    // Remove guest cart
    await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);

    res.json({ success: true, message: 'Cart merged.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, mergeCart };
