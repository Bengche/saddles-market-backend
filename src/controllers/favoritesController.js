const pool = require("../config/database");

const getFavorites = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.created_at, p.id AS product_id, p.name, p.slug, p.price, p.compare_price,
              p.brand, p.discipline, p.stock_quantity,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = $1 AND p.is_active = TRUE
       ORDER BY f.created_at DESC`,
      [req.user.id],
    );

    res.json({ success: true, data: { favorites: result.rows } });
  } catch (err) {
    next(err);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const { productId } = req.body;

    await pool.query(
      "INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user.id, productId],
    );

    res.json({ success: true, message: "Added to favorites." });
  } catch (err) {
    next(err);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const { productId } = req.params;

    await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND product_id = $2",
      [req.user.id, productId],
    );

    res.json({ success: true, message: "Removed from favorites." });
  } catch (err) {
    next(err);
  }
};

const checkFavorite = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2",
      [req.user.id, productId],
    );

    res.json({ success: true, data: { isFavorited: result.rows.length > 0 } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite, checkFavorite };
