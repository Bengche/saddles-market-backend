const { validationResult } = require("express-validator");
const pool = require("../config/database");
const cloudinary = require("../config/cloudinary");
const slugify = require("slugify");

// ─── List Products ─────────────────────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      discipline,
      minPrice,
      maxPrice,
      search,
      sort = "created_at_desc",
      featured,
      seatSize,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ["p.is_active = TRUE"];

    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (discipline) {
      params.push(discipline);
      conditions.push(`p.discipline = $${params.length}`);
    }
    if (minPrice) {
      params.push(parseFloat(minPrice));
      conditions.push(`p.price >= $${params.length}`);
    }
    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      conditions.push(`p.price <= $${params.length}`);
    }
    if (seatSize) {
      params.push(seatSize);
      conditions.push(`p.seat_size = $${params.length}`);
    }
    if (featured === "true") {
      conditions.push("p.is_featured = TRUE");
    }
    if (search) {
      params.push("%" + search.toLowerCase() + "%");
      conditions.push(
        `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`,
      );
    }

    const sortMap = {
      created_at_desc: "p.created_at DESC",
      price_asc: "p.price ASC",
      price_desc: "p.price DESC",
      name_asc: "p.name ASC",
      rating_desc: "p.average_rating DESC",
      popular: "p.sold_count DESC",
    };
    const orderBy = sortMap[sort] || "p.created_at DESC";

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}`,
      params,
    );

    const totalCount = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.discipline,
              p.seat_size, p.gullet_width, p.brand, p.color, p.condition,
              p.is_featured, p.average_rating, p.review_count, p.stock_quantity,
              p.is_trial_eligible, p.short_description,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Product ────────────────────────────────────────────────────────
const getProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT p.*,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1 AND p.is_active = TRUE`,
      [slug],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = result.rows[0];

    // Get images
    const images = await pool.query(
      "SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order ASC",
      [product.id],
    );

    // Get approved reviews
    const reviews = await pool.query(
      `SELECT pr.*, u.first_name, u.last_name, u.avatar_url
       FROM product_reviews pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.product_id = $1 AND pr.is_approved = TRUE
       ORDER BY pr.created_at DESC LIMIT 10`,
      [product.id],
    );

    // Get related products
    const related = await pool.query(
      `SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.discipline, p.brand,
              (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image
       FROM products p
       WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = TRUE
       LIMIT 4`,
      [product.category_id, product.id],
    );

    res.json({
      success: true,
      data: {
        product: {
          ...product,
          images: images.rows,
          reviews: reviews.rows,
          relatedProducts: related.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Categories ────────────────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.sort_order ASC`,
    );

    res.json({ success: true, data: { categories: result.rows } });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Create Product ─────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      categoryId,
      discipline,
      shortDescription,
      description,
      price,
      comparePrice,
      costPrice,
      stockQuantity,
      lowStockThreshold,
      weightLbs,
      seatSize,
      gulletWidth,
      treeType,
      leatherType,
      leatherOrigin,
      hornHeight,
      cantleHeight,
      rigging,
      fenderType,
      stirrupType,
      color,
      warranty,
      brand,
      countryOfOrigin,
      condition,
      isFeatured,
      isTrialEligible,
      metaTitle,
      metaDescription,
      metaKeywords,
      tags,
      images,
      availableSeatSizes,
      availableColors,
      availableTreeSizes,
    } = req.body;

    let slug = slugify(name, { lower: true, strict: true });
    // Ensure unique slug
    const existing = await pool.query(
      "SELECT id FROM products WHERE slug LIKE $1",
      [slug + "%"],
    );
    if (existing.rows.length > 0) {
      slug = slug + "-" + Date.now();
    }

    const result = await pool.query(
      `INSERT INTO products
        (name, slug, category_id, discipline, short_description, description,
         price, compare_price, cost_price, stock_quantity, low_stock_threshold,
         weight_lbs, seat_size, gullet_width, tree_type, leather_type, leather_origin,
         horn_height, cantle_height, rigging, fender_type, stirrup_type, color,
         warranty, brand, country_of_origin, condition, is_featured, is_trial_eligible,
         meta_title, meta_description, meta_keywords, tags,
         available_seat_sizes, available_colors, available_tree_sizes)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
       RETURNING *`,
      [
        name,
        slug,
        categoryId || null,
        discipline || null,
        shortDescription,
        description,
        price,
        comparePrice || null,
        costPrice || null,
        stockQuantity || 0,
        lowStockThreshold || 5,
        weightLbs || null,
        seatSize || null,
        gulletWidth || null,
        treeType || null,
        leatherType || null,
        leatherOrigin || null,
        hornHeight || null,
        cantleHeight || null,
        rigging || null,
        fenderType || null,
        stirrupType || null,
        color || null,
        warranty || null,
        brand || null,
        countryOfOrigin || null,
        condition || "new",
        isFeatured || false,
        isTrialEligible !== false,
        metaTitle || name,
        metaDescription || shortDescription,
        metaKeywords || null,
        tags || null,
        availableSeatSizes || [],
        availableColors || [],
        availableTreeSizes || [],
      ],
    );

    const product = result.rows[0];

    // Handle images
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          `INSERT INTO product_images (product_id, cloudinary_id, url, alt_text, is_primary, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            product.id,
            images[i].cloudinaryId,
            images[i].url,
            images[i].altText || name,
            i === 0,
            i,
          ],
        );
      }
    }

    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Update Product ─────────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    // Build dynamic update query
    const allowedFields = [
      "name",
      "category_id",
      "discipline",
      "short_description",
      "description",
      "price",
      "compare_price",
      "cost_price",
      "stock_quantity",
      "low_stock_threshold",
      "weight_lbs",
      "seat_size",
      "gullet_width",
      "tree_type",
      "leather_type",
      "leather_origin",
      "horn_height",
      "cantle_height",
      "rigging",
      "fender_type",
      "stirrup_type",
      "color",
      "warranty",
      "brand",
      "country_of_origin",
      "condition",
      "is_featured",
      "is_active",
      "is_trial_eligible",
      "meta_title",
      "meta_description",
      "meta_keywords",
      "tags",
      "available_seat_sizes",
      "available_colors",
      "available_tree_sizes",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      if (fields[camelField] !== undefined) {
        updates.push(`${field} = $${values.length + 1}`);
        values.push(fields[camelField]);
      }
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update." });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    res.json({ success: true, data: { product: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Delete Product ─────────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get cloudinary IDs to delete
    const images = await pool.query(
      "SELECT cloudinary_id FROM product_images WHERE product_id = $1",
      [id],
    );

    // Soft delete product
    await pool.query("UPDATE products SET is_active = FALSE WHERE id = $1", [
      id,
    ]);

    // Delete cloudinary images
    for (const img of images.rows) {
      try {
        await cloudinary.uploader.destroy(img.cloudinary_id);
      } catch {
        // Non-critical
      }
    }

    res.json({ success: true, message: "Product removed." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
};
