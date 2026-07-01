const pool = require("../config/database");

// ─── Get Cart ──────────────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];

    let query, params;
    if (userId) {
      query = `SELECT ci.*, p.name, p.price, p.compare_price, p.stock_quantity,
                      p.seat_size, p.brand, p.slug, p.is_active,
                      ci.selected_seat_size, ci.selected_color,
                      ci.selected_tree_size, ci.selected_width,
                      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
               FROM cart_items ci
               JOIN products p ON p.id = ci.product_id
               WHERE ci.user_id = $1 AND p.is_active = TRUE`;
      params = [userId];
    } else if (sessionId) {
      query = `SELECT ci.*, p.name, p.price, p.compare_price, p.stock_quantity,
                      p.seat_size, p.brand, p.slug, p.is_active,
                      ci.selected_seat_size, ci.selected_color,
                      ci.selected_tree_size, ci.selected_width,
                      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
               FROM cart_items ci
               JOIN products p ON p.id = ci.product_id
               WHERE ci.session_id = $1 AND p.is_active = TRUE`;
      params = [sessionId];
    } else {
      // Always return a valid empty cart object, never 404
      return res.json({ success: true, data: { items: [], subtotal: 0 } });
    }

    const result = await pool.query(query, params);

    const items = result.rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      quantity: row.quantity,
      selected_seat_size: row.selected_seat_size,
      selected_color: row.selected_color,
      selected_tree_size: row.selected_tree_size,
      selected_width: row.selected_width,
      product: {
        id: row.product_id,
        name: row.name,
        slug: row.slug,
        price: parseFloat(row.price),
        compare_price: row.compare_price
          ? parseFloat(row.compare_price)
          : null,
        stock_quantity: row.stock_quantity,
        primary_image: row.image || null,
        images: [],
      },
    }));

    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const item_count = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, data: { items, subtotal, item_count } });
  } catch (err) {
    next(err);
  }
};

// ─── Add to Cart ───────────────────────────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const {
      productId,
      quantity = 1,
      selectedSeatSize,
      selectedColor,
      selectedTreeSize,
      selectedWidth,
    } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];

    if (!userId && !sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "Session required." });
    }

    // Verify product exists and is active
    const product = await pool.query(
      "SELECT id, stock_quantity FROM products WHERE id = $1 AND is_active = TRUE",
      [productId],
    );

    if (product.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const existing = userId
      ? await pool.query(
          "SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
          [userId, productId],
        )
      : await pool.query(
          "SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2",
          [sessionId, productId],
        );

    if (existing.rows.length > 0) {
      const newQty = Math.min(
        existing.rows[0].quantity + parseInt(quantity),
        10,
      );
      await pool.query(
        `UPDATE cart_items SET quantity = $1,
          selected_seat_size = $3, selected_color = $4,
          selected_tree_size = $5, selected_width = $6
         WHERE id = $2`,
        [
          newQty,
          existing.rows[0].id,
          selectedSeatSize || null,
          selectedColor || null,
          selectedTreeSize || null,
          selectedWidth || null,
        ],
      );
    } else {
      if (userId) {
        await pool.query(
          `INSERT INTO cart_items
            (user_id, product_id, quantity, selected_seat_size, selected_color, selected_tree_size, selected_width)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            productId,
            parseInt(quantity),
            selectedSeatSize || null,
            selectedColor || null,
            selectedTreeSize || null,
            selectedWidth || null,
          ],
        );
      } else {
        await pool.query(
          `INSERT INTO cart_items
            (session_id, product_id, quantity, selected_seat_size, selected_color, selected_tree_size, selected_width)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sessionId,
            productId,
            parseInt(quantity),
            selectedSeatSize || null,
            selectedColor || null,
            selectedTreeSize || null,
            selectedWidth || null,
          ],
        );
      }
    }

    res.json({ success: true, message: "Item added to cart." });
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
    const sessionId = req.headers["x-session-id"];

    if (parseInt(quantity) <= 0) {
      const condition = userId ? "user_id = $2" : "session_id = $2";
      const param = userId || sessionId;
      await pool.query(
        `DELETE FROM cart_items WHERE id = $1 AND ${condition}`,
        [id, param],
      );
    } else {
      const condition = userId ? "user_id = $3" : "session_id = $3";
      const param = userId || sessionId;
      await pool.query(
        `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND ${condition}`,
        [Math.min(parseInt(quantity), 10), id, param],
      );
    }

    res.json({ success: true, message: "Cart updated." });
  } catch (err) {
    next(err);
  }
};

// ─── Remove from Cart ──────────────────────────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];

    const condition = userId ? "user_id = $2" : "session_id = $2";
    const param = userId || sessionId;

    await pool.query(`DELETE FROM cart_items WHERE id = $1 AND ${condition}`, [
      id,
      param,
    ]);

    res.json({ success: true, message: "Item removed from cart." });
  } catch (err) {
    next(err);
  }
};

// ─── Clear Cart ────────────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];

    if (userId) {
      await pool.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
    } else if (sessionId) {
      await pool.query("DELETE FROM cart_items WHERE session_id = $1", [
        sessionId,
      ]);
    }

    res.json({ success: true, message: "Cart cleared." });
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
      return res.json({ success: true, message: "No session cart to merge." });
    }

    const guestItems = await pool.query(
      "SELECT * FROM cart_items WHERE session_id = $1",
      [sessionId],
    );

    for (const item of guestItems.rows) {
      const existing = await pool.query(
        "SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
        [userId, item.product_id],
      );

      if (existing.rows.length > 0) {
        const newQty = Math.min(existing.rows[0].quantity + item.quantity, 10);
        await pool.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [
          newQty,
          existing.rows[0].id,
        ]);
      } else {
        await pool.query(
          "INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
          [userId, item.product_id, item.quantity],
        );
      }
    }

    // Remove guest cart
    await pool.query("DELETE FROM cart_items WHERE session_id = $1", [
      sessionId,
    ]);

    res.json({ success: true, message: "Cart merged." });
  } catch (err) {
    next(err);
  }
};

// ─── Apply Coupon ──────────────────────────────────────────────────────────────
const applyCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || !subtotal) {
      return res
        .status(400)
        .json({ success: false, message: "Code and subtotal are required." });
    }
    const result = await pool.query(
      `SELECT * FROM coupons
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE
         AND (valid_until IS NULL OR valid_until > NOW())
         AND (usage_limit IS NULL OR times_used < usage_limit)
         AND minimum_order <= $2`,
      [code, subtotal],
    );
    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired coupon code." });
    }
    const c = result.rows[0];
    let discount = 0;
    if (c.discount_type === "percentage") {
      discount = (parseFloat(subtotal) * parseFloat(c.discount_value)) / 100;
      if (c.maximum_discount)
        discount = Math.min(discount, parseFloat(c.maximum_discount));
    } else {
      discount = parseFloat(c.discount_value);
    }
    res.json({
      success: true,
      discount,
      couponId: c.id,
      message: "Coupon applied!",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
  applyCoupon,
};
