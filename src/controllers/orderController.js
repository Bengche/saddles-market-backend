const pool = require('../config/database');
const { sendEmail } = require('../utils/emailService');
const {
  orderConfirmationTemplate,
  orderNotificationSalesTemplate,
  orderStatusUpdateTemplate,
} = require('../utils/emailTemplates');
const SITE_CONFIG = require('../config/siteConfig');

// Helper: Generate order number
const generateOrderNumber = async (client) => {
  const result = await client.query("SELECT generate_order_number()");
  return result.rows[0].generate_order_number;
};

// ─── Place Order ───────────────────────────────────────────────────────────────
const placeOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      items, shippingAddress, billingAddress, billedSameAsShip = true,
      customerNotes, shippingMethod = 'standard', couponCode,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await client.query(
        `SELECT p.*, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image
         FROM products p WHERE p.id = $1 AND p.is_active = TRUE`,
        [item.productId]
      );

      if (product.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      const p = product.rows[0];
      const quantity = parseInt(item.quantity) || 1;
      const itemTotal = parseFloat(p.price) * quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: p.id,
        productName: p.name,
        productSku: p.sku,
        productImage: p.primary_image,
        seatSize: item.seatSize || p.seat_size,
        price: p.price,
        quantity,
        total: itemTotal,
      });
    }

    // Shipping cost
    let shippingCost = subtotal >= SITE_CONFIG.shipping.freeShippingThreshold
      ? 0
      : shippingMethod === 'express'
        ? SITE_CONFIG.shipping.expressShippingCost
        : SITE_CONFIG.shipping.standardShippingCost;

    // Coupon
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await client.query(
        `SELECT * FROM coupons
         WHERE UPPER(code) = UPPER($1) AND is_active = TRUE
           AND (valid_until IS NULL OR valid_until > NOW())
           AND (usage_limit IS NULL OR times_used < usage_limit)
           AND minimum_order <= $2`,
        [couponCode, subtotal]
      );

      if (coupon.rows.length > 0) {
        const c = coupon.rows[0];
        if (c.discount_type === 'percentage') {
          discountAmount = (subtotal * parseFloat(c.discount_value)) / 100;
          if (c.maximum_discount) discountAmount = Math.min(discountAmount, parseFloat(c.maximum_discount));
        } else {
          discountAmount = parseFloat(c.discount_value);
        }
        await client.query(
          'UPDATE coupons SET times_used = times_used + 1 WHERE id = $1',
          [c.id]
        );
      }
    }

    const total = Math.max(0, subtotal + shippingCost - discountAmount);

    // Trial end date
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + SITE_CONFIG.policies.trialDays);

    const orderNumber = await generateOrderNumber(client);
    const userId = req.user?.id || null;
    const customerEmail = shippingAddress.email || req.user?.email;

    const orderResult = await client.query(
      `INSERT INTO orders
        (order_number, user_id, guest_email, guest_first_name, guest_last_name, guest_phone,
         ship_first_name, ship_last_name, ship_company, ship_street_line1, ship_street_line2,
         ship_city, ship_state, ship_zip, ship_country, ship_phone,
         bill_same_as_ship, bill_first_name, bill_last_name, bill_street_line1, bill_street_line2,
         bill_city, bill_state, bill_zip, bill_country,
         subtotal, shipping_cost, discount_amount, total,
         coupon_code, shipping_method, customer_notes, trial_end_date, ip_address)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
       RETURNING *`,
      [
        orderNumber, userId, customerEmail,
        userId ? null : shippingAddress.firstName,
        userId ? null : shippingAddress.lastName,
        userId ? null : shippingAddress.phone,
        shippingAddress.firstName, shippingAddress.lastName, shippingAddress.company || null,
        shippingAddress.streetLine1, shippingAddress.streetLine2 || null,
        shippingAddress.city, shippingAddress.state, shippingAddress.zip,
        shippingAddress.country || 'United States', shippingAddress.phone || null,
        billedSameAsShip,
        billedSameAsShip ? null : billingAddress?.firstName,
        billedSameAsShip ? null : billingAddress?.lastName,
        billedSameAsShip ? null : billingAddress?.streetLine1,
        billedSameAsShip ? null : billingAddress?.streetLine2,
        billedSameAsShip ? null : billingAddress?.city,
        billedSameAsShip ? null : billingAddress?.state,
        billedSameAsShip ? null : billingAddress?.zip,
        billedSameAsShip ? null : billingAddress?.country,
        subtotal, shippingCost, discountAmount, total,
        couponCode || null, shippingMethod, customerNotes || null,
        trialEndDate,
        req.ip || null,
      ]
    );

    const order = orderResult.rows[0];

    // Insert order items
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_sku, product_image, seat_size, price, quantity, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [order.id, item.productId, item.productName, item.productSku, item.productImage, item.seatSize, item.price, item.quantity, item.total]
      );

      // Update sold count
      await client.query(
        'UPDATE products SET sold_count = sold_count + $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    // Clear cart if user is logged in
    if (userId) {
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    }

    await client.query('COMMIT');

    // Send emails (non-blocking)
    const firstName = shippingAddress.firstName || req.user?.first_name || 'Customer';

    const customerEmailData = orderConfirmationTemplate({
      firstName,
      order: { ...order, guest_email: customerEmail },
      items: orderItems.map((i) => ({
        product_name: i.productName,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
        seat_size: i.seatSize,
      })),
    });

    const salesEmailData = orderNotificationSalesTemplate({
      order: { ...order, guest_email: customerEmail, guest_phone: shippingAddress.phone },
      items: orderItems.map((i) => ({
        product_name: i.productName,
        quantity: i.quantity,
        total: i.total,
        seat_size: i.seatSize,
      })),
      customerEmail,
    });

    await Promise.all([
      sendEmail({ to: customerEmail, ...customerEmailData }),
      sendEmail({ to: SITE_CONFIG.contact.salesEmail, ...salesEmailData }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Check your email for confirmation.',
      data: { orderId: order.id, orderNumber: order.order_number },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── Get User Orders ───────────────────────────────────────────────────────────
const getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [req.user.id]
    );

    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'id', oi.id, 'productName', oi.product_name, 'quantity', oi.quantity,
                'price', oi.price, 'total', oi.total, 'productImage', oi.product_image,
                'seatSize', oi.seat_size
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Order ──────────────────────────────────────────────────────────
const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.* FROM orders o
       WHERE o.id = $1 AND (o.user_id = $2 OR $2 IS NULL)`,
      [id, req.user?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = result.rows[0];

    const items = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order.id]
    );

    res.json({ success: true, data: { order: { ...order, items: items.rows } } });
  } catch (err) {
    next(err);
  }
};

// ─── Request Refund ────────────────────────────────────────────────────────────
const requestRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = result.rows[0];

    if (order.status === 'cancelled' || order.status === 'rejected' || order.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'This order cannot be refunded.' });
    }

    // Check 30-day trial window
    if (order.trial_end_date && new Date() > new Date(order.trial_end_date)) {
      return res.status(400).json({
        success: false,
        message: 'The 30-day trial period for this order has expired.',
      });
    }

    await pool.query(
      `UPDATE orders SET status = 'refund_requested', refund_requested_at = NOW(), refund_reason = $1 WHERE id = $2`,
      [reason || null, id]
    );

    // Notify sales team
    await sendEmail({
      to: SITE_CONFIG.contact.salesEmail,
      subject: `Refund Requested — Order ${order.order_number}`,
      html: `<p>A refund has been requested for order <strong>${order.order_number}</strong>.</p>
             <p>Reason: ${reason || 'No reason provided'}</p>
             <p><a href="${process.env.FRONTEND_URL}/admin/orders/${order.id}">View Order</a></p>`,
    });

    res.json({ success: true, message: 'Refund request submitted. Our team will be in touch within 24 hours.' });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Get All Orders ─────────────────────────────────────────────────────
const adminGetOrders = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, status, paymentStatus, search,
      dateFrom, dateTo,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (paymentStatus) {
      params.push(paymentStatus);
      conditions.push(`o.payment_status = $${params.length}`);
    }
    if (search) {
      params.push('%' + search + '%');
      const p = params.length;
      conditions.push(`(o.order_number ILIKE $${p} OR o.ship_first_name ILIKE $${p} OR o.ship_last_name ILIKE $${p} OR o.guest_email ILIKE $${p})`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`o.created_at >= $${params.length}`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`o.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders o ${whereClause}`,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT o.id, o.created_at, o.total_amount, o.status, o.tracking_number,
              o.shipping_method,
              COALESCE(u.first_name, o.ship_first_name) AS first_name,
              COALESCE(u.last_name, o.ship_last_name) AS last_name,
              COALESCE(u.email, o.guest_email, o.ship_email) AS email
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Update Order Status ────────────────────────────────────────────────
const adminUpdateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingNumber, carrier, notes, message } = req.body;

    const orderResult = await pool.query(
      `SELECT o.*, COALESCE(u.email, o.guest_email) AS customer_email,
              COALESCE(u.first_name, o.ship_first_name) AS first_name
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orderResult.rows[0];
    const updates = [];
    const params = [];

    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);

      if (status === 'shipped') {
        updates.push(`shipped_at = NOW()`);
      }
      if (status === 'delivered') {
        updates.push(`delivered_at = NOW()`);
      }
    }
    if (paymentStatus) {
      params.push(paymentStatus);
      updates.push(`payment_status = $${params.length}`);
    }
    if (trackingNumber) {
      params.push(trackingNumber);
      updates.push(`tracking_number = $${params.length}`);
    }
    if (carrier) {
      params.push(carrier);
      updates.push(`carrier = $${params.length}`);
    }
    if (notes) {
      params.push(notes);
      updates.push(`admin_notes = $${params.length}`);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE orders SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );
    }

    // Send status update email
    if (status && order.customer_email) {
      const emailData = orderStatusUpdateTemplate({
        firstName: order.first_name || 'Customer',
        order,
        newStatus: status,
        message,
        trackingNumber,
        carrierName: carrier,
      });
      await sendEmail({ to: order.customer_email, ...emailData });
    }

    res.json({ success: true, message: 'Order updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  placeOrder,
  getUserOrders,
  getOrder,
  requestRefund,
  adminGetOrders,
  adminUpdateOrderStatus,
};
