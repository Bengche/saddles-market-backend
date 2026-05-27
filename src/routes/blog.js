const express = require("express");
const router = express.Router();
const pool = require("../config/database");

router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 9, category } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = `WHERE bp.is_published = TRUE`;
    const params = [];

    if (category) {
      params.push(category);
      where += ` AND bp.category = $${params.length}`;
    }

    params.push(Number(limit), offset);
    const dataQuery = `
      SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image, bp.category, bp.reading_time, bp.published_at
      FROM blog_posts bp
      ${where}
      ORDER BY bp.published_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const countQuery = `SELECT COUNT(*) FROM blog_posts bp ${where}`;
    const countParams = params.slice(0, params.length - 2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      success: true,
      data: {
        posts: dataResult.rows,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND is_published = TRUE LIMIT 1`,
      [req.params.slug],
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    }

    // Map 'content' to 'body' for frontend compatibility
    const post = {
      ...result.rows[0],
      body: result.rows[0].content,
    };

    // Fetch related posts (same category, excluding self)
    const related = await pool.query(
      `SELECT id, title, slug, excerpt, cover_image, category, reading_time, published_at
       FROM blog_posts
       WHERE category = $1 AND slug != $2 AND is_published = TRUE
       ORDER BY published_at DESC LIMIT 3`,
      [post.category, post.slug],
    );

    res.json({ success: true, data: { post, related: related.rows } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
