const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const cloudinary = require("../config/cloudinary");
const {
  uploadProductImages,
  uploadSingleImage,
  uploadBlogImage,
} = require("../middleware/upload");
const { adminOnly } = require("../middleware/admin");

// Upload product images
router.post("/products", adminOnly, (req, res) => {
  uploadProductImages(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No images uploaded." });
    }

    const images = req.files.map((file) => ({
      cloudinaryId: file.filename,
      url: file.path,
      altText: req.body.altText || "",
    }));

    res.json({ success: true, data: { images } });
  });
});

// Upload single image (avatar, blog cover)
router.post("/single", adminOnly, (req, res) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image uploaded." });
    }

    res.json({
      success: true,
      data: { cloudinaryId: req.file.filename, url: req.file.path },
    });
  });
});

// Upload blog cover image
router.post("/blog", adminOnly, (req, res) => {
  uploadBlogImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image uploaded." });
    }

    res.json({
      success: true,
      data: { cloudinaryId: req.file.filename, url: req.file.path },
    });
  });
});

// Delete image from Cloudinary
router.delete("/:cloudinaryId", adminOnly, async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.cloudinaryId);
    await cloudinary.uploader.destroy(publicId);

    // Remove from DB if product image
    await pool.query("DELETE FROM product_images WHERE cloudinary_id = $1", [
      publicId,
    ]);

    res.json({ success: true, message: "Image deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
