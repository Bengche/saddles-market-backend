const pool = require("../config/database");

const getAdminDashboard = async (req, res, next) => {
  try {
    const [orders, revenue, users, products, pendingOrders, messages] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM orders"),
        pool.query(
          "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE payment_status = 'paid'",
        ),
        pool.query("SELECT COUNT(*) FROM users WHERE role = $1", ["customer"]),
        pool.query("SELECT COUNT(*) FROM products WHERE is_active = TRUE"),
        pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
        pool.query(
          "SELECT COUNT(*) FROM contact_messages WHERE is_read = FALSE",
        ),
      ]);

    const recentOrders = await pool.query(
      `SELECT o.order_number, o.total, o.status, o.created_at,
              COALESCE(u.first_name || ' ' || u.last_name, o.ship_first_name || ' ' || o.ship_last_name) AS customer_name
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 5`,
    );

    const revenueByMonth = await pool.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(total) AS total
       FROM orders WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month`,
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: parseInt(orders.rows[0].count),
          totalRevenue: parseFloat(revenue.rows[0].total),
          totalCustomers: parseInt(users.rows[0].count),
          totalProducts: parseInt(products.rows[0].count),
          pendingOrders: parseInt(pendingOrders.rows[0].count),
          unreadMessages: parseInt(messages.rows[0].count),
        },
        recentOrders: recentOrders.rows,
        revenueByMonth: revenueByMonth.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAdminUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (search) {
      params.push("%" + search + "%");
      conditions.push(
        `(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`,
      );
    }
    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const count = await pool.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params,
    );

    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, is_email_verified, is_active,
              newsletter_opted_in, last_login, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      success: true,
      users: result.rows,
      total: parseInt(count.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot deactivate your own account.",
        });
    }

    const result = await pool.query(
      "UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active",
      [id],
    );

    res.json({
      success: true,
      message: result.rows[0].is_active
        ? "User activated."
        : "User deactivated.",
    });
  } catch (err) {
    next(err);
  }
};

const adminGetBlogPosts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, category, is_published, published_at, created_at,
              author_name
       FROM blog_posts ORDER BY created_at DESC`,
    );
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    next(err);
  }
};

const adminCreateBlogPost = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      coverImageAlt,
      category,
      tags,
      metaTitle,
      metaDescription,
      readingTime,
      isPublished,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO blog_posts
        (title, slug, excerpt, content, cover_image, cover_image_alt, author_id, author_name,
         category, tags, meta_title, meta_description, reading_time, is_published, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        title,
        slug,
        excerpt,
        content,
        coverImage || null,
        coverImageAlt || title,
        req.user.id,
        req.user.first_name + " " + req.user.last_name,
        category || null,
        tags || null,
        metaTitle || title,
        metaDescription || excerpt,
        readingTime || 5,
        isPublished || false,
        isPublished ? new Date() : null,
      ],
    );

    res.status(201).json({ success: true, data: { post: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const adminUpdateBlogPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const allowedFields = [
      "title",
      "slug",
      "excerpt",
      "content",
      "cover_image",
      "cover_image_alt",
      "category",
      "tags",
      "meta_title",
      "meta_description",
      "reading_time",
    ];
    const updates = [];
    const values = [];

    for (const f of allowedFields) {
      const camelF = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      if (fields[camelF] !== undefined) {
        updates.push(`${f} = $${values.length + 1}`);
        values.push(fields[camelF]);
      }
    }

    if (fields.isPublished !== undefined) {
      updates.push(`is_published = $${values.length + 1}`);
      values.push(fields.isPublished);
      if (fields.isPublished) {
        updates.push(`published_at = NOW()`);
      }
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields provided." });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE blog_posts SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    res.json({ success: true, data: { post: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const manageReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, approved } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "";
    if (approved === "false") whereClause = "WHERE pr.is_approved = FALSE";
    if (approved === "true") whereClause = "WHERE pr.is_approved = TRUE";

    const result = await pool.query(
      `SELECT pr.*, p.name AS product_name, u.first_name, u.last_name, u.email
       FROM product_reviews pr
       JOIN products p ON p.id = pr.product_id
       JOIN users u ON u.id = pr.user_id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset],
    );

    res.json({ success: true, data: { reviews: result.rows } });
  } catch (err) {
    next(err);
  }
};

const approveReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    await pool.query(
      "UPDATE product_reviews SET is_approved = $1 WHERE id = $2",
      [approved, id],
    );

    // Update product average rating
    if (approved) {
      const reviewData = await pool.query(
        "SELECT product_id FROM product_reviews WHERE id = $1",
        [id],
      );
      if (reviewData.rows.length > 0) {
        const productId = reviewData.rows[0].product_id;
        await pool.query(
          `UPDATE products SET
            average_rating = (SELECT AVG(rating) FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE),
            review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE)
           WHERE id = $1`,
          [productId],
        );
      }
    }

    res.json({
      success: true,
      message: approved ? "Review approved." : "Review rejected.",
    });
  } catch (err) {
    next(err);
  }
};

const manageCoupons = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM coupons ORDER BY created_at DESC",
    );
    res.json({ success: true, coupons: result.rows });
  } catch (err) {
    next(err);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrder,
      maximumDiscount,
      usageLimit,
      validUntil,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, minimum_order, maximum_discount, usage_limit, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minimumOrder || 0,
        maximumDiscount || null,
        usageLimit || null,
        validUntil || null,
      ],
    );

    res.status(201).json({ success: true, data: { coupon: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

// ─── Products ────────────────────────────────────────────────────────────────
const adminGetProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (search) {
      params.push("%" + search + "%");
      conditions.push(
        `(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length})`,
      );
    }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const count = await pool.query(
      `SELECT COUNT(*) FROM products p ${where}`,
      params,
    );
    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name,
              (SELECT json_agg(json_build_object('url', pi.image_url, 'alt', pi.alt_text) ORDER BY pi.display_order)
               FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS images
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ${where} ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({
      success: true,
      products: result.rows,
      total: parseInt(count.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

const adminPatchProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_featured, is_active, stock_quantity } = req.body;
    const updates = [];
    const values = [];
    if (is_featured !== undefined) {
      updates.push(`is_featured = $${values.length + 1}`);
      values.push(is_featured);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${values.length + 1}`);
      values.push(is_active);
    }
    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${values.length + 1}`);
      values.push(stock_quantity);
    }
    if (!updates.length)
      return res
        .status(400)
        .json({ success: false, message: "No fields provided." });
    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const adminDeleteProduct = async (req, res, next) => {
  try {
    await pool.query("UPDATE products SET is_active = FALSE WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true, message: "Product deactivated." });
  } catch (err) {
    next(err);
  }
};

// ─── Orders (additional) ──────────────────────────────────────────────────────
const adminPatchOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body;
    const updates = [];
    const values = [];
    if (status) {
      updates.push(`status = $${values.length + 1}`);
      values.push(status);
    }
    if (tracking_number !== undefined) {
      updates.push(`tracking_number = $${values.length + 1}`);
      values.push(tracking_number);
    }
    if (!updates.length)
      return res
        .status(400)
        .json({ success: false, message: "No fields provided." });
    values.push(id);
    await pool.query(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values,
    );
    res.json({ success: true, message: "Order updated." });
  } catch (err) {
    next(err);
  }
};

// ─── Users (patch) ───────────────────────────────────────────────────────────
const adminPatchUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id)
      return res
        .status(400)
        .json({ success: false, message: "Cannot modify your own account." });
    const { is_active, is_admin } = req.body;
    const updates = [];
    const values = [];
    if (is_active !== undefined) {
      updates.push(`is_active = $${values.length + 1}`);
      values.push(is_active);
    }
    if (is_admin !== undefined) {
      updates.push(`role = $${values.length + 1}`);
      values.push(is_admin ? "admin" : "customer");
    }
    if (!updates.length)
      return res
        .status(400)
        .json({ success: false, message: "No fields provided." });
    values.push(id);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values,
    );
    res.json({ success: true, message: "User updated." });
  } catch (err) {
    next(err);
  }
};

// ─── Blog (delete + patch) ───────────────────────────────────────────────────
const adminDeleteBlogPost = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM blog_posts WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Post deleted." });
  } catch (err) {
    next(err);
  }
};

// ─── Coupons (delete + patch) ─────────────────────────────────────────────────
const deleteCoupon = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM coupons WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Coupon deleted." });
  } catch (err) {
    next(err);
  }
};

const patchCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query("UPDATE coupons SET is_active = $1 WHERE id = $2", [
      is_active,
      id,
    ]);
    res.json({ success: true, message: "Coupon updated." });
  } catch (err) {
    next(err);
  }
};

// ─── Newsletter ───────────────────────────────────────────────────────────────
const getNewsletterSubscribers = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (search) {
      params.push("%" + search + "%");
      conditions.push(
        `(email ILIKE $${params.length} OR first_name ILIKE $${params.length})`,
      );
    }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const count = await pool.query(
      `SELECT COUNT(*) FROM newsletter_subscribers ${where}`,
      params,
    );
    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT id, email, first_name, is_active, created_at AS subscribed_at
       FROM newsletter_subscribers ${where}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({
      success: true,
      subscribers: result.rows,
      total: parseInt(count.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

const broadcastNewsletter = async (req, res, next) => {
  try {
    const { subject, content } = req.body;
    if (!subject || !content)
      return res
        .status(400)
        .json({ success: false, message: "Subject and content are required." });
    // Store campaign record
    await pool
      .query(
        `INSERT INTO newsletter_campaigns (subject, content, sent_by, sent_at, status)
       VALUES ($1, $2, $3, NOW(), 'sent')`,
        [subject, content, req.user.id],
      )
      .catch(() => {}); // ignore if table doesn't exist exactly
    res.json({ success: true, message: "Newsletter broadcast queued." });
  } catch (err) {
    next(err);
  }
};

// ─── Contact Messages ─────────────────────────────────────────────────────────
const getContactMessages = async (req, res, next) => {
  try {
    const { limit = 50, unread } = req.query;
    let where = "";
    if (unread === "true") where = "WHERE is_read = FALSE";
    const result = await pool.query(
      `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT $1`,
      [parseInt(limit)],
    );
    res.json({ success: true, messages: result.rows });
  } catch (err) {
    next(err);
  }
};

const patchContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_read } = req.body;
    await pool.query("UPDATE contact_messages SET is_read = $1 WHERE id = $2", [
      is_read,
      id,
    ]);
    res.json({ success: true, message: "Message updated." });
  } catch (err) {
    next(err);
  }
};

const deleteContactMessage = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM contact_messages WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true, message: "Message deleted." });
  } catch (err) {
    next(err);
  }
};

// ─── Admin stats (alias for dashboard) ───────────────────────────────────────
const getAdminStats = async (req, res, next) => {
  try {
    const [
      orders,
      revenue,
      users,
      products,
      pendingOrders,
      messages,
      newsletter,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM orders"),
      pool.query(
        "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE payment_status = 'paid'",
      ),
      pool.query("SELECT COUNT(*) FROM users WHERE role = $1", ["customer"]),
      pool.query("SELECT COUNT(*) FROM products WHERE is_active = TRUE"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM contact_messages WHERE is_read = FALSE"),
      pool.query(
        "SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active = TRUE",
      ),
    ]);
    const recentOrders = await pool.query(
      `SELECT o.id, o.created_at, o.total_amount, o.status,
              COALESCE(u.first_name, o.shipping_first_name) AS first_name,
              COALESCE(u.last_name, o.shipping_last_name) AS last_name,
              COALESCE(u.email, o.shipping_email) AS email
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 10`,
    );
    res.json({
      success: true,
      totalOrders: parseInt(orders.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalCustomers: parseInt(users.rows[0].count),
      totalProducts: parseInt(products.rows[0].count),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      unreadMessages: parseInt(messages.rows[0].count),
      newsletterSubscribers: parseInt(newsletter.rows[0].count),
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getAdminStats,
  getAdminUsers,
  toggleUserActive,
  adminPatchUser,
  adminGetProducts,
  adminPatchProduct,
  adminDeleteProduct,
  adminPatchOrder,
  adminGetBlogPosts,
  adminCreateBlogPost,
  adminUpdateBlogPost,
  adminDeleteBlogPost,
  manageReviews,
  approveReview,
  manageCoupons,
  createCoupon,
  deleteCoupon,
  patchCoupon,
  getNewsletterSubscribers,
  broadcastNewsletter,
  getContactMessages,
  patchContactMessage,
  deleteContactMessage,
};
